import { injectable, inject } from 'tsyringe';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { ICacheService, ILLMService, IToolService, ToolCallRequest, verifyAccessToken } from '@financer/backend-shared';
import { ChatSchema } from '../validators/llm.validator';
import { ChatService } from '../services/ChatService';

const STREAM_PORT = Number(process.env.LLM_STREAM_PORT ?? 3007);
const RATE_LIMIT_PER_MINUTE = 20;
const MAX_TOOL_CALLS = 3;

@injectable()
export class ChatStreamServer {
  private readonly baseUrl: string;
  private readonly chatModel: string;

  constructor(
    @inject('ILLMService') private readonly llmService: ILLMService,
    @inject('ICacheService') private readonly cache: ICacheService,
    @inject('IToolService') private readonly toolService: IToolService,
    @inject('IChatService') private readonly chatService: ChatService,
  ) {
    this.baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    this.chatModel = process.env.OLLAMA_CHAT_MODEL ?? 'qwen3.5:9b';
  }

  async start(): Promise<void> {
    const app = express();
    app.use(cors());
    app.use(express.json({ limit: '16kb' }));

    app.post('/llm/chat/stream', (req, res) => this.handleStream(req, res));

    app.get('/health', (_req, res) => {
      res.json({ success: true, data: { service: 'llm-stream', status: 'ok' } });
    });

    try {
      const server = app.listen(STREAM_PORT, () => {
        console.info(`[ChatStream] SSE server listening on port ${STREAM_PORT}`);
      });
      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          console.info(`[ChatStream] Port ${STREAM_PORT} already bound — SSE server already running`);
        } else {
          console.error('[ChatStream] Server error:', err);
        }
      });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'EADDRINUSE') {
        console.info(`[ChatStream] Port ${STREAM_PORT} already in use — SSE server already running`);
      } else {
        console.error('[ChatStream] Failed to start:', err);
      }
    }
  }

  private async handleStream(req: Request, res: Response): Promise<void> {
    // --- Auth ---
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
      return;
    }

    let userId: string;
    try {
      const token = authHeader.slice(7);
      const payload = verifyAccessToken(token);
      userId = payload.sub;
    } catch {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
      return;
    }

    // --- Rate limit ---
    try {
      const key = `rate_limit:llm:${userId}`;
      const now = Date.now();
      const uniqueId = `${now}:${Math.random().toString(36).slice(2, 10)}`;
      const count = await this.cache.slidingWindowCount(key, 60_000, now, uniqueId);
      if (count > RATE_LIMIT_PER_MINUTE) {
        res.status(429).json({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded. Try again in a minute.' } });
        return;
      }
    } catch {
      // Redis down — allow the request
    }

    // --- Content-Type check ---
    if (!req.is('application/json')) {
      res.status(415).json({ success: false, error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Content-Type must be application/json' } });
      return;
    }

    // --- Validate body ---
    const parseResult = ChatSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing message field' } });
      return;
    }
    const { message } = parseResult.data;

    // --- SSE headers ---
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let closed = false;
    const abortController = new AbortController();
    const streamTimeout = setTimeout(() => abortController.abort(), 120_000);
    req.on('close', () => {
      closed = true;
      clearTimeout(streamTimeout);
      abortController.abort();
    });

    try {
      // 1. Build context (also produces embedding for reuse)
      const context = await this.llmService.buildChatContext(userId, message);

      // 2. Save user message — pass cached embedding to skip redundant embed call
      const { id: userMessageId } = await this.llmService.saveUserMessage(userId, message, context.embedding);

      // 3. Stream with tool-calling loop
      let prompt = context.prompt;
      const systemPrompt = this.chatService.buildSystemPromptWithTools();
      let fullResponse = '';
      let toolCallCount = 0;

      while (toolCallCount <= MAX_TOOL_CALLS) {
        if (closed) break;

        // Stream from Ollama
        const streamResult = await this.streamFromOllama(
          res, prompt, systemPrompt, abortController, closed,
        );

        if (!streamResult) {
          // Ollama unavailable — fallback already sent
          return;
        }

        fullResponse = streamResult;

        // Check if response is a tool call
        const toolCall = this.chatService.parseToolCall(fullResponse);
        if (!toolCall || toolCallCount === MAX_TOOL_CALLS) {
          break;
        }

        toolCallCount++;
        console.info(`[ChatStream] Tool call ${toolCallCount}: ${toolCall.name}`);

        // Notify client about tool call
        this.sendEvent(res, 'tool_call', { name: toolCall.name, status: 'executing' });

        // Execute the tool
        const toolResult = await this.toolService.executeTool(userId, toolCall);

        // Notify client about tool result
        this.sendEvent(res, 'tool_result', {
          name: toolResult.name,
          summary: toolResult.error
            ? `Error: ${toolResult.error}`
            : this.summarizeToolResult(toolResult.result),
        });

        // Build new prompt with tool result
        prompt += `\n\nAssistant: ${fullResponse}\n\nTool result for ${toolResult.name}:\n${this.chatService.formatToolResult(toolResult)}\n\nNow provide your final answer to the user based on this data:`;
        fullResponse = '';

        // Reset streaming content on client
        this.sendEvent(res, 'stream_reset', {});
      }

      clearTimeout(streamTimeout);

      // 4. Clean up response
      const cleanResponse = this.cleanResponse(fullResponse);

      // 5. Save assistant message
      let assistantMessageId: string | undefined;
      try {
        const result = await this.llmService.saveAssistantMessage(userId, cleanResponse);
        assistantMessageId = result.id;
      } catch (err) {
        console.error('[ChatStream] Failed to save assistant message:', err);
      }

      // 6. Send done event
      this.sendEvent(res, 'done', {
        content: cleanResponse,
        userMessageId,
        assistantMessageId,
      });

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[ChatStream] Stream error:', errMsg);

      if (!closed) {
        this.sendEvent(res, 'error', { error: 'An internal error occurred' });
        this.sendEvent(res, 'fallback', {
          content: 'Sorry, I encountered an issue processing your request. Please try again.',
        });
        this.sendEvent(res, 'done', {});
      }
    } finally {
      if (!closed) {
        res.end();
      }
    }
  }

  private async streamFromOllama(
    res: Response,
    prompt: string,
    systemPrompt: string,
    abortController: AbortController,
    closed: boolean,
  ): Promise<string | null> {
    const ollamaBody = {
      model: this.chatModel,
      prompt,
      stream: true,
      options: { temperature: 0.7, num_predict: 500 },
      ...(systemPrompt && { system: systemPrompt }),
    };

    const ollamaRes = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ollamaBody),
      signal: abortController.signal,
    });

    if (!ollamaRes.ok || !ollamaRes.body) {
      this.sendEvent(res, 'error', { error: 'LLM service unavailable' });
      this.sendEvent(res, 'fallback', {
        content: 'I\'m having trouble connecting to my AI model right now. Your financial data is safe — please try again in a moment.',
      });
      this.sendEvent(res, 'done', {});
      res.end();
      return null;
    }

    let fullResponse = '';
    let insideThink = false;
    let thinkBuffer = '';
    const reader = ollamaRes.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        if (closed) break;

        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line) as { response?: string; done?: boolean };
            if (parsed.response) {
              fullResponse += parsed.response;

              // Filter out <think>...</think> blocks from streamed tokens
              const token = parsed.response;
              if (insideThink) {
                thinkBuffer += token;
                if (thinkBuffer.includes('</think>')) {
                  // Thinking block ended — emit any text after the closing tag
                  const afterThink = thinkBuffer.split('</think>').pop()?.trim() ?? '';
                  insideThink = false;
                  thinkBuffer = '';
                  if (afterThink) {
                    this.sendEvent(res, 'token', { content: afterThink });
                  }
                }
              } else if (token.includes('<think>') || thinkBuffer.length > 0) {
                // Thinking block starts — suppress tokens until </think>
                thinkBuffer += token;
                if (thinkBuffer.includes('</think>')) {
                  const afterThink = thinkBuffer.split('</think>').pop()?.trim() ?? '';
                  thinkBuffer = '';
                  if (afterThink) {
                    this.sendEvent(res, 'token', { content: afterThink });
                  }
                } else {
                  insideThink = true;
                }
              } else {
                this.sendEvent(res, 'token', { content: token });
              }
            }
            if (parsed.done) {
              break;
            }
          } catch {
            // Partial JSON line — skip
          }
        }
      }
    } catch (readerErr) {
      if (!closed) throw readerErr;
    } finally {
      try { reader.cancel(); } catch { /* already released */ }
    }

    // Strip thinking blocks from final response
    fullResponse = fullResponse.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();
    return fullResponse;
  }

  private sendEvent(res: Response, event: string, data: object): void {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  private cleanResponse(raw: string): string {
    // If LLM returned a tool call JSON that wasn't processed, provide fallback
    const toolCall = this.chatService.parseToolCall(raw);
    if (toolCall) {
      return 'I tried to look up your data but encountered an issue. Could you try rephrasing your question?';
    }

    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null && typeof parsed.response === 'string') {
        return parsed.response;
      }
    } catch {
      // Not JSON
    }
    return raw;
  }

  private summarizeToolResult(result: unknown): string {
    if (Array.isArray(result)) {
      return `${result.length} item(s) found`;
    }
    if (typeof result === 'object' && result !== null) {
      const obj = result as Record<string, unknown>;
      if ('totalSpending' in obj) return `Total: $${Number(obj.totalSpending).toFixed(2)}`;
      if ('totalIncome' in obj) return `Total: $${Number(obj.totalIncome).toFixed(2)}`;
    }
    return 'Data retrieved';
  }
}
