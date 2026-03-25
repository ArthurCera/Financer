import { injectable, inject } from 'tsyringe';
import {
  ILLMProvider,
  IVectorRepository,
  IQueueService,
  NotFoundError,
  expenses,
  eq,
  and,
  gte,
  lt,
  isNull,
  sum,
  sql,
  categories,
} from '@financer/backend-shared';
import type { CategorizeResponse, ChatMessage, ChatHistoryResponse } from '@financer/shared';
import { LLMChatRepository } from '../repositories/LLMChatRepository';
import { CategoryRepository, type CategoryInfo } from '../repositories/CategoryRepository';
import { CategorizeResponseSchema } from '../validators/llm.validator';
import { CATEGORIZE_SYSTEM, CHAT_SYSTEM } from '../prompts';

interface BatchJob {
  userId: string;
  month: number;
  year: number;
}

@injectable()
export class LLMService {
  constructor(
    @inject('ILLMProvider') private readonly llmProvider: ILLMProvider,
    @inject('IVectorRepository') private readonly vectorRepo: IVectorRepository,
    @inject('IQueueService') private readonly queueService: IQueueService,
    @inject('LLMChatRepository') private readonly chatRepo: LLMChatRepository,
    @inject('CategoryRepository') private readonly categoryRepo: CategoryRepository,
    @inject('db') private readonly db: any,
  ) {}

  // ---------------------------------------------------------------------------
  // Categorize — single expense
  // ---------------------------------------------------------------------------

  async categorize(userId: string, expenseId: string): Promise<CategorizeResponse> {
    // Fetch expense
    const [expense] = await this.db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, expenseId), eq(expenses.userId, userId)));

    if (!expense) {
      throw new NotFoundError('Expense', expenseId);
    }

    // Fetch categories
    const allCategories = await this.categoryRepo.findAll();

    const prompt = this.buildCategorizePrompt(
      expense.description ?? 'No description',
      parseFloat(expense.amount as string),
      expense.date as string,
      allCategories,
    );

    const rawResponse = await this.llmProvider.complete(prompt, {
      systemPrompt: CATEGORIZE_SYSTEM,
      temperature: 0.1,
    });

    // Parse and validate LLM response
    const parsed = this.parseCategorizeResponse(rawResponse, allCategories);

    // Update expense category
    await this.db
      .update(expenses)
      .set({ categoryId: parsed.categoryId, updatedAt: new Date() })
      .where(eq(expenses.id, expenseId));

    return {
      expenseId,
      categoryId: parsed.categoryId,
      categoryName: parsed.categoryName,
      confidence: parsed.confidence,
    };
  }

  // ---------------------------------------------------------------------------
  // Categorize — batch (async via RabbitMQ)
  // ---------------------------------------------------------------------------

  async categorizeBatch(userId: string, month: number, year: number): Promise<void> {
    const job: BatchJob = { userId, month, year };
    await this.queueService.publish('llm.categorize-batch', job);
  }

  async processBatchJob(job: BatchJob): Promise<void> {
    const { userId, month, year } = job;
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-01`;

    // Fetch uncategorized expenses for the period
    const uncategorized = await this.db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          isNull(expenses.categoryId),
          gte(expenses.date, start),
          lt(expenses.date, end),
        ),
      );

    const allCategories = await this.categoryRepo.findAll();

    for (const expense of uncategorized) {
      try {
        const prompt = this.buildCategorizePrompt(
          expense.description ?? 'No description',
          parseFloat(expense.amount as string),
          expense.date as string,
          allCategories,
        );

        const rawResponse = await this.llmProvider.complete(prompt, {
          systemPrompt: CATEGORIZE_SYSTEM,
          temperature: 0.1,
        });

        const parsed = this.parseCategorizeResponse(rawResponse, allCategories);

        await this.db
          .update(expenses)
          .set({ categoryId: parsed.categoryId, updatedAt: new Date() })
          .where(eq(expenses.id, expense.id));
      } catch (error) {
        console.error(`[LLM] Failed to categorize expense ${expense.id}:`, error);
        // Continue with next expense
      }
    }
  }

  /** Start consuming batch jobs from the queue */
  async startBatchWorker(): Promise<void> {
    await this.queueService.consume<BatchJob>('llm.categorize-batch', async (job) => {
      await this.processBatchJob(job);
    });
  }

  // ---------------------------------------------------------------------------
  // Chat
  // ---------------------------------------------------------------------------

  async chat(userId: string, message: string): Promise<ChatMessage> {
    // 1. Save user message
    const userMsg = await this.chatRepo.saveMessage(userId, 'user', message);

    // 2. Generate embedding and store
    try {
      const embedding = await this.llmProvider.embed(message);
      await this.vectorRepo.upsert(userMsg.id, embedding, {
        userId,
        role: 'user',
        content: message,
      });
    } catch (error) {
      console.warn('[LLM] Embedding failed, continuing without vector search:', error);
    }

    // 3. Find similar past messages for context
    let contextMessages: string[] = [];
    try {
      const embedding = await this.llmProvider.embed(message);
      const similar = await this.vectorRepo.similaritySearch(embedding, 5, { userId });
      contextMessages = similar
        .filter((s) => s.score > 0.3)
        .map((s) => `[${s.metadata['role']}]: ${s.metadata['content']}`);
    } catch {
      // Vector search failed — continue without context
    }

    // 4. Fetch financial summary for context
    const financialContext = await this.getFinancialContext(userId);

    // 5. Build prompt
    const contextBlock = contextMessages.length > 0
      ? `\n\nRelevant past conversation:\n${contextMessages.join('\n')}`
      : '';

    const prompt = `${financialContext}${contextBlock}\n\nUser: ${message}`;

    // 6. Generate response
    const reply = await this.llmProvider.complete(prompt, {
      systemPrompt: CHAT_SYSTEM,
      temperature: 0.7,
      maxTokens: 500,
    });

    // Clean up JSON format if the model wraps it (since we set format: 'json' globally)
    const cleanReply = this.cleanChatResponse(reply);

    // 7. Save assistant response
    const assistantMsg = await this.chatRepo.saveMessage(userId, 'assistant', cleanReply);

    // 8. Embed assistant response
    try {
      const assistantEmbedding = await this.llmProvider.embed(cleanReply);
      await this.vectorRepo.upsert(assistantMsg.id, assistantEmbedding, {
        userId,
        role: 'assistant',
        content: cleanReply,
      });
    } catch {
      // Non-critical
    }

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
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildCategorizePrompt(
    description: string,
    amount: number,
    date: string,
    categoryList: CategoryInfo[],
  ): string {
    const categoriesJson = categoryList.map((c) => ({ id: c.id, name: c.name }));
    return `Expense: "${description}", amount: $${amount.toFixed(2)}, date: ${date}\n\nAvailable categories:\n${JSON.stringify(categoriesJson, null, 2)}`;
  }

  private parseCategorizeResponse(
    raw: string,
    allCategories: CategoryInfo[],
  ): { categoryId: string; categoryName: string; confidence: number } {
    try {
      const parsed = JSON.parse(raw);
      const validated = CategorizeResponseSchema.safeParse(parsed);
      if (validated.success) {
        // Verify the categoryId actually exists
        const found = allCategories.find((c) => c.id === validated.data.categoryId);
        if (found) return validated.data;
      }

      // Fallback: try to match by name
      if (parsed.categoryName) {
        const match = allCategories.find(
          (c) => c.name.toLowerCase() === parsed.categoryName.toLowerCase(),
        );
        if (match) {
          return {
            categoryId: match.id,
            categoryName: match.name,
            confidence: parsed.confidence ?? 0.5,
          };
        }
      }
    } catch {
      // JSON parse failed
    }

    // Last resort: default to first category with low confidence
    const fallback = allCategories[allCategories.length - 1] ?? { id: '', name: 'Other' };
    return { categoryId: fallback.id, categoryName: fallback.name, confidence: 0.1 };
  }

  private async getFinancialContext(userId: string): Promise<string> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-01`;

    try {
      // Total expenses this month
      const [expenseRow] = await this.db
        .select({ total: sum(expenses.amount) })
        .from(expenses)
        .where(and(eq(expenses.userId, userId), gte(expenses.date, start), lt(expenses.date, end)));

      const totalExpenses = parseFloat((expenseRow?.total as string) ?? '0');

      // Top categories
      const catRows = await this.db
        .select({
          categoryName: categories.name,
          total: sum(expenses.amount),
        })
        .from(expenses)
        .leftJoin(categories, eq(expenses.categoryId, categories.id))
        .where(and(eq(expenses.userId, userId), gte(expenses.date, start), lt(expenses.date, end)))
        .groupBy(categories.name)
        .limit(5);

      const topCategories = (catRows as any[])
        .map((r) => `${r.categoryName ?? 'Uncategorized'}: $${parseFloat(r.total ?? '0').toFixed(2)}`)
        .join(', ');

      return `Financial summary for ${year}-${String(month).padStart(2, '0')}:\n- Total expenses: $${totalExpenses.toFixed(2)}\n- Top categories: ${topCategories || 'none'}`;
    } catch {
      return 'Financial data unavailable.';
    }
  }

  private cleanChatResponse(raw: string): string {
    // If the model returned JSON (because format: 'json'), extract the text content
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        // Try common keys the model might use
        return (parsed.response ?? parsed.reply ?? parsed.content ?? parsed.message ?? parsed.text ?? raw) as string;
      }
    } catch {
      // Not JSON — use as-is
    }
    return raw;
  }
}
