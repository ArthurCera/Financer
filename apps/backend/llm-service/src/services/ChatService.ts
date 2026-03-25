import { injectable, inject } from 'tsyringe';
import {
  ILLMProvider,
  IVectorRepository,
  ICacheService,
  ILLMChatRepository,
  IToolService,
  ToolCallRequest,
  ToolCallResult,
} from '@financer/backend-shared';
import type { ChatMessage, ChatHistoryResponse } from '@financer/shared';
import { buildToolSystemPrompt, MAX_TOOL_CALLS } from '../prompts';

@injectable()
export class ChatService {
  constructor(
    @inject('ILLMProvider') private readonly llmProvider: ILLMProvider,
    @inject('IVectorRepository') private readonly vectorRepo: IVectorRepository,
    @inject('ICacheService') private readonly cache: ICacheService,
    @inject('ILLMChatRepository') private readonly chatRepo: ILLMChatRepository,
    @inject('IToolService') private readonly toolService: IToolService,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async chat(userId: string, message: string): Promise<ChatMessage> {
    const context = await this.buildChatContext(userId, message);

    // Reuse the embedding from context building to avoid a second embed call
    await this.saveUserMessage(userId, message, context.embedding);
    const systemPrompt = context.systemPrompt;

    let prompt = context.prompt;
    let reply = '';

    // Tool-calling loop: execute up to MAX_TOOL_CALLS tools
    // Use low temperature for reliable tool-call JSON; higher for final answer
    let usedTools = false;
    for (let i = 0; i < MAX_TOOL_CALLS; i++) {
      reply = await this.llmProvider.complete(prompt, {
        systemPrompt,
        temperature: 0.3,
        maxTokens: 500,
        think: false,
      });

      const toolCall = this.parseToolCall(reply);
      if (!toolCall) break;

      usedTools = true;
      console.info(`[LLM] Tool call ${i + 1}/${MAX_TOOL_CALLS}: ${toolCall.name}`, JSON.stringify(toolCall.arguments));
      const toolResult = await this.toolService.executeTool(userId, toolCall);
      prompt += `\n\nAssistant: ${reply}\n\nTool result for ${toolResult.name}:\n${this.formatToolResult(toolResult)}\n\nUsing the data above, respond to the user in plain text. Do NOT call any more tools.`;
    }

    // If the final reply is still a tool call after the loop, force a plain-text answer
    if (this.parseToolCall(reply)) {
      reply = await this.llmProvider.complete(
        prompt + `\n\nAssistant: ${reply}\n\nYou have used all available tool calls. Summarize what you know and respond to the user in plain text. Do NOT output JSON.`,
        { systemPrompt, temperature: 0.7, maxTokens: 500 },
      );
    }

    // If tools were used but the reply came out as plain text from the loop (good!),
    // and it was the low-temp tool-detection call that produced it, re-generate with
    // higher temperature for a more natural response
    if (usedTools && !this.parseToolCall(reply) && reply.length < 20) {
      reply = await this.llmProvider.complete(prompt, {
        systemPrompt,
        temperature: 0.7,
        maxTokens: 500,
      });
    }

    const cleanReply = this.cleanChatResponse(reply);
    const assistantMsg = await this.saveAssistantMessage(userId, cleanReply);

    return {
      id: assistantMsg.id,
      role: 'assistant',
      content: cleanReply,
      createdAt: assistantMsg.createdAt.toISOString(),
    };
  }

  async chatHistory(userId: string): Promise<ChatHistoryResponse> {
    const messages = await this.chatRepo.getHistory(userId, 50);
    return {
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // Context building
  // ---------------------------------------------------------------------------

  private async buildChatContext(userId: string, message: string): Promise<{ prompt: string; systemPrompt: string; embedding: number[] | null }> {
    const recentIds = new Set<string>();
    let recentHistory: string[] = [];
    try {
      const history = await this.chatRepo.getHistory(userId, 10);
      for (const m of history) recentIds.add(m.id);
      recentHistory = history.map((m) => `[${m.role}]: ${m.content}`);
    } catch (err) {
      console.warn('[LLM] Chat history query failed, continuing without history:', err);
    }

    // Skip RAG for very short messages (greetings, "hi", "thanks")
    let contextMessages: string[] = [];
    let embedding: number[] | null = null;
    const needsRag = message.trim().split(/\s+/).length > 3;

    if (needsRag) {
      // Cap RAG at 5 seconds so we don't block the response.
      // If embed/vector search is slow (Ollama cold-start, model loading),
      // we gracefully degrade to history-only context.
      const RAG_TIMEOUT_MS = 5_000;
      try {
        const ragResult = await Promise.race([
          this.performRag(message, userId, recentIds),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), RAG_TIMEOUT_MS)),
        ]);
        if (ragResult) {
          embedding = ragResult.embedding;
          contextMessages = ragResult.contextMessages;
        } else {
          console.warn('[LLM] RAG timed out — continuing with history only');
        }
      } catch (err) {
        console.warn('[LLM] RAG failed, continuing without context:', err);
      }
    }

    const vectorBlock = contextMessages.length > 0
      ? `\n\nRelevant past conversation:\n${contextMessages.join('\n')}`
      : '';
    const historyBlock = recentHistory.length > 0
      ? `\n\nRecent messages:\n${recentHistory.slice(-6).join('\n')}`
      : '';

    const prompt = `${vectorBlock}${historyBlock}\n\nUser: ${message}`;
    const systemPrompt = this.buildSystemPrompt();
    return { prompt, systemPrompt, embedding };
  }

  // ---------------------------------------------------------------------------
  // RAG helper
  // ---------------------------------------------------------------------------

  private async performRag(
    message: string,
    userId: string,
    recentIds: Set<string>,
  ): Promise<{ embedding: number[]; contextMessages: string[] }> {
    const embedding = await this.llmProvider.embed(message);
    const similar = await this.vectorRepo.similaritySearch(embedding, 5, { userId });
    const contextMessages = similar
      .filter((s) => s.score > 0.3 && !recentIds.has(s.id))
      .map((s) => `[${String(s.metadata['role'])}]: ${String(s.metadata['content'])}`);
    return { embedding, contextMessages };
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  private async saveUserMessage(userId: string, message: string, cachedEmbedding?: number[] | null): Promise<{ id: string }> {
    const userMsg = await this.chatRepo.saveMessage(userId, 'user', message);

    // Reuse cached embedding from buildChatContext when available
    const embedPromise = cachedEmbedding
      ? Promise.resolve(cachedEmbedding)
      : this.llmProvider.embed(message);

    void embedPromise.then(async (embedding) => {
      await this.vectorRepo.upsert(userMsg.id, embedding, {
        userId,
        role: 'user',
        content: message,
      });
    }).catch((err: unknown) => {
      console.error('[LLM] User message embedding failed:', err);
    });

    return { id: userMsg.id };
  }

  private async saveAssistantMessage(userId: string, content: string): Promise<{ id: string; createdAt: Date }> {
    const msg = await this.chatRepo.saveMessage(userId, 'assistant', content);

    void this.llmProvider.embed(content).then(async (embedding) => {
      await this.vectorRepo.upsert(msg.id, embedding, {
        userId,
        role: 'assistant',
        content,
      });
    }).catch((err: unknown) => {
      console.error('[LLM] Assistant message embedding failed:', err);
    });

    return { id: msg.id, createdAt: msg.createdAt };
  }

  // ---------------------------------------------------------------------------
  // Tool-calling helpers
  // ---------------------------------------------------------------------------

  private parseToolCall(response: string): ToolCallRequest | null {
    const trimmed = response.trim();

    let jsonStr = trimmed;

    // Handle markdown code blocks wrapping
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // Try to extract JSON object from the response
    const jsonMatch = jsonStr.match(/\{[\s\S]*"tool_call"[\s\S]*\}/);
    if (!jsonMatch) return null;

    try {
      const parsed = JSON.parse(jsonMatch[0]) as { tool_call?: { name?: string; arguments?: Record<string, unknown> } };
      if (
        parsed.tool_call &&
        typeof parsed.tool_call.name === 'string' &&
        typeof parsed.tool_call.arguments === 'object'
      ) {
        return {
          name: parsed.tool_call.name,
          arguments: parsed.tool_call.arguments ?? {},
        };
      }
    } catch {
      // Not valid JSON
    }

    return null;
  }

  private formatToolResult(result: ToolCallResult): string {
    if (result.error) {
      return `Error: ${result.error}`;
    }
    return JSON.stringify(result.result, null, 2);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildSystemPrompt(): string {
    const tools = this.toolService.listTools();
    return buildToolSystemPrompt(tools);
  }

  private cleanChatResponse(raw: string): string {
    // Safety net: if the response is still tool-call JSON after loop + forced retry, give a clear error
    if (this.parseToolCall(raw)) {
      return 'I was unable to complete your request. Please try again.';
    }

    // If model wrapped response in JSON (e.g. {"response": "..."}), unwrap it
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return (parsed.response ?? parsed.reply ?? parsed.content ?? parsed.message ?? parsed.text ?? raw) as string;
      }
    } catch {
      // Not JSON — use as-is
    }
    return raw;
  }
}
