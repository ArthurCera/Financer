import { injectable, inject } from 'tsyringe';
import {
  ILLMProvider,
  IVectorRepository,
  IQueueService,
  ICacheService,
  ILLMChatRepository,
  IExpenseRepository,
  IToolService,
  ToolCallRequest,
  ToolCallResult,
} from '@financer/backend-shared';
import type { ChatMessage, ChatHistoryResponse } from '@financer/shared';
import { buildToolSystemPrompt, CHAT_SYSTEM } from '../prompts';

const MAX_TOOL_CALLS = 3;

interface ChatJob {
  jobId: string;
  userId: string;
  message: string;
}

@injectable()
export class ChatService {
  constructor(
    @inject('ILLMProvider') private readonly llmProvider: ILLMProvider,
    @inject('IVectorRepository') private readonly vectorRepo: IVectorRepository,
    @inject('IQueueService') private readonly queueService: IQueueService,
    @inject('ICacheService') private readonly cache: ICacheService,
    @inject('ILLMChatRepository') private readonly chatRepo: ILLMChatRepository,
    @inject('IExpenseRepository') private readonly expenseRepo: IExpenseRepository,
    @inject('IToolService') private readonly toolService: IToolService,
  ) {}

  // ---------------------------------------------------------------------------
  // Queue-based chat (fallback path)
  // ---------------------------------------------------------------------------

  async queueChat(jobId: string, userId: string, message: string): Promise<void> {
    const job: ChatJob = { jobId, userId, message };
    await this.queueService.publish('llm.chat', job);
  }

  async processChatJob(job: ChatJob): Promise<void> {
    const { jobId, userId, message } = job;
    try {
      const reply = await this.chat(userId, message);
      await this.cache.set(`chat_job:${jobId}`, { status: 'completed', reply }, 300);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[LLM] Chat job ${jobId} failed:`, errMsg);
      await this.cache.set(`chat_job:${jobId}`, { status: 'failed', error: errMsg }, 300);
    }
  }

  async startChatWorker(): Promise<void> {
    await this.queueService.consume<ChatJob>('llm.chat', async (job) => {
      await this.processChatJob(job);
    });
  }

  // ---------------------------------------------------------------------------
  // Chat orchestration with tool-calling loop
  // ---------------------------------------------------------------------------

  async chat(userId: string, message: string): Promise<ChatMessage> {
    const context = await this.buildChatContext(userId, message);

    // Reuse the embedding from context building to avoid a second embed call
    await this.saveUserMessage(userId, message, context.embedding);
    const systemPrompt = this.buildSystemPromptWithTools();

    let prompt = context.prompt;
    let reply = '';

    // Tool-calling loop: up to MAX_TOOL_CALLS iterations
    for (let i = 0; i <= MAX_TOOL_CALLS; i++) {
      reply = await this.llmProvider.complete(prompt, {
        systemPrompt,
        temperature: 0.7,
        maxTokens: 500,
      });

      const toolCall = this.parseToolCall(reply);
      if (!toolCall || i === MAX_TOOL_CALLS) {
        break;
      }

      console.info(`[LLM] Tool call: ${toolCall.name}`, JSON.stringify(toolCall.arguments));
      const toolResult = await this.toolService.executeTool(userId, toolCall);
      prompt += `\n\nAssistant: ${reply}\n\nTool result for ${toolResult.name}:\n${this.formatToolResult(toolResult)}\n\nNow provide your final answer to the user based on this data:`;
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
  // Public helpers (used by ChatStreamServer for SSE streaming)
  // ---------------------------------------------------------------------------

  async buildChatContext(userId: string, message: string): Promise<{ prompt: string; systemPrompt: string; embedding: number[] | null }> {
    const recentIds = new Set<string>();
    let recentHistory: string[] = [];
    try {
      const history = await this.chatRepo.getHistory(userId, 10);
      for (const m of history) recentIds.add(m.id);
      recentHistory = history.map((m) => `[${m.role}]: ${m.content}`);
    } catch (err) {
      console.warn('[LLM] Chat history query failed, continuing without history:', err);
    }

    // Skip RAG for very short messages (greetings, "hi", "thanks") — saves an embed + vector search
    let contextMessages: string[] = [];
    let embedding: number[] | null = null;
    const needsRag = message.trim().split(/\s+/).length > 3;

    if (needsRag) {
      try {
        embedding = await this.llmProvider.embed(message);
        const similar = await this.vectorRepo.similaritySearch(embedding, 5, { userId });
        contextMessages = similar
          .filter((s) => s.score > 0.3 && !recentIds.has(s.id))
          .map((s) => `[${String(s.metadata['role'])}]: ${String(s.metadata['content'])}`);
      } catch (err) {
        console.warn('[LLM] Vector search failed, continuing without context:', err);
      }
    }

    const vectorBlock = contextMessages.length > 0
      ? `\n\nRelevant past conversation:\n${contextMessages.join('\n')}`
      : '';
    const historyBlock = recentHistory.length > 0
      ? `\n\nRecent messages:\n${recentHistory.slice(-6).join('\n')}`
      : '';

    const prompt = `${vectorBlock}${historyBlock}\n\nUser: ${message}`;
    return { prompt, systemPrompt: this.buildSystemPromptWithTools(), embedding };
  }

  buildSystemPromptWithTools(): string {
    const tools = this.toolService.listTools();
    return buildToolSystemPrompt(tools);
  }

  async saveUserMessage(userId: string, message: string, cachedEmbedding?: number[] | null): Promise<{ id: string }> {
    const userMsg = await this.chatRepo.saveMessage(userId, 'user', message);

    // Reuse cached embedding from buildChatContext when available to avoid a redundant embed call
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

  async saveAssistantMessage(userId: string, content: string): Promise<{ id: string; createdAt: Date }> {
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

  parseToolCall(response: string): ToolCallRequest | null {
    const trimmed = response.trim();

    // Try to find JSON with tool_call key
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

  formatToolResult(result: ToolCallResult): string {
    if (result.error) {
      return `Error: ${result.error}`;
    }
    return JSON.stringify(result.result, null, 2);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private cleanChatResponse(raw: string): string {
    // If the response is a tool call JSON that wasn't caught, strip it
    const toolCall = this.parseToolCall(raw);
    if (toolCall) {
      return 'I tried to look up your data but encountered an issue. Could you try rephrasing your question?';
    }

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
