import { createHash } from 'node:crypto';
import { injectable, inject } from 'tsyringe';
import {
  ILLMProvider,
  ICacheService,
  ICategoryRepository,
  IExpenseRepository,
  NotFoundError,
  CategoryDto,
  ExpenseDto,
} from '@financer/backend-shared';
import type { CategorizeResponse, CategorizeBatchResult } from '@financer/shared';
import { CATEGORIZE_SYSTEM } from '../prompts';

type CategoryInfo = Pick<CategoryDto, 'id' | 'name'>;
type MatchResult = { categoryId: string; categoryName: string; confidence: number };

const BATCH_CONCURRENCY = 5;

@injectable()
export class CategorizationService {
  /** TTL for cached categorization results (1 hour) */
  private static readonly CACHE_TTL = 3600;

  constructor(
    @inject('ILLMProvider') private readonly llmProvider: ILLMProvider,
    @inject('ICacheService') private readonly cache: ICacheService,
    @inject('ICategoryRepository') private readonly categoryRepo: ICategoryRepository,
    @inject('IExpenseRepository') private readonly expenseRepo: IExpenseRepository,
  ) {}

  async categorize(userId: string, expenseId: string): Promise<CategorizeResponse> {
    const expense = await this.expenseRepo.findById(expenseId);
    if (!expense || expense.userId !== userId) {
      throw new NotFoundError('Expense', expenseId);
    }

    const userCategories = await this.categoryRepo.findForUser(userId);
    const match = await this.categorizeExpense(expense, userCategories);

    await this.expenseRepo.update(expenseId, { categoryId: match.categoryId });

    return {
      expenseId,
      categoryId: match.categoryId,
      categoryName: match.categoryName,
      confidence: match.confidence,
    };
  }

  async categorizeBatchSync(userId: string, month: number, year: number, recategorizeAll?: boolean): Promise<CategorizeBatchResult> {
    const expenses = recategorizeAll
      ? await this.expenseRepo.findByUserAndPeriod(userId, month, year)
      : await this.expenseRepo.findUncategorizedByUserAndPeriod(userId, month, year);
    const total = expenses.length;
    if (total === 0) return { total: 0, categorized: 0, failed: 0 };

    const userCategories = await this.categoryRepo.findForUser(userId);
    let categorized = 0;

    for (let i = 0; i < expenses.length; i += BATCH_CONCURRENCY) {
      const batch = expenses.slice(i, i + BATCH_CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (expense) => {
          const match = await this.categorizeExpense(expense, userCategories);
          await this.expenseRepo.update(expense.id, { categoryId: match.categoryId });
        }),
      );
      categorized += results.filter((r) => r.status === 'fulfilled').length;
    }

    return { total, categorized, failed: total - categorized };
  }

  /**
   * Categorize a description+amount against the user's categories.
   * Used by OCR to resolve a category after extracting expense data from a receipt.
   */
  async categorizeDescription(
    userId: string,
    description: string,
    amount: number,
  ): Promise<{ categoryId: string; categoryName: string } | null> {
    try {
      const categories = await this.categoryRepo.findForUser(userId);
      const categoryNames = categories.map((c) => c.name);
      const cacheKey = this.buildCacheKey(description, amount, categoryNames);

      const cached = await this.cache.get<MatchResult>(cacheKey).catch(() => null);
      if (cached && cached.confidence >= 0.7) {
        return { categoryId: cached.categoryId, categoryName: cached.categoryName };
      }

      const prompt = `Description: "${description}"
Amount: $${amount.toFixed(2)}

Categories: ${categoryNames.join(', ')}

Category:`;

      const rawResponse = await this.llmProvider.complete(prompt, {
        systemPrompt: CATEGORIZE_SYSTEM,
        temperature: 0,
        maxTokens: 20,
        think: false,
      });

      const result = this.matchCategory(rawResponse, categories);
      if (result.confidence >= 0.7) {
        this.cache.set(cacheKey, result, CategorizationService.CACHE_TTL).catch(() => {});
        return { categoryId: result.categoryId, categoryName: result.categoryName };
      }
      return null;
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private async categorizeExpense(
    expense: ExpenseDto,
    categories: CategoryInfo[],
  ): Promise<MatchResult> {
    const description = expense.description ?? 'No description';
    const categoryNames = categories.map((c) => c.name);
    const cacheKey = this.buildCacheKey(description, expense.amount, categoryNames);

    // Check cache first — identical description+amount+categories → same result
    try {
      const cached = await this.cache.get<MatchResult>(cacheKey);
      if (cached) return cached;
    } catch { /* cache miss or Redis down — continue to LLM */ }

    try {
      const prompt = `Description: "${description}"
Amount: $${expense.amount.toFixed(2)}

Categories: ${categoryNames.join(', ')}

Category:`;

      const rawResponse = await this.llmProvider.complete(prompt, {
        systemPrompt: CATEGORIZE_SYSTEM,
        temperature: 0,
        maxTokens: 20,
        think: false,
      });

      const result = this.matchCategory(rawResponse, categories);

      // Only cache high-confidence results (not fallbacks)
      if (result.confidence >= 0.7) {
        this.cache.set(cacheKey, result, CategorizationService.CACHE_TTL).catch(() => {});
      }

      return result;
    } catch (error) {
      console.error(`[LLM] Failed to categorize expense ${expense.id}:`, error);
      return this.fallback(categories);
    }
  }

  /** Deterministic cache key from the inputs that affect categorization output */
  private buildCacheKey(description: string, amount: number, categoryNames: string[]): string {
    const hash = createHash('sha256')
      .update(`${description}|${amount.toFixed(2)}|${categoryNames.join(',')}`)
      .digest('hex')
      .slice(0, 16);
    return `llm:categorize:${hash}`;
  }

  /**
   * Match the LLM's plain-text response against known category names.
   * Tries exact match, then case-insensitive, then substring contains.
   */
  private matchCategory(
    raw: string,
    categories: CategoryInfo[],
  ): MatchResult {
    // Strip think blocks + any surrounding quotes/whitespace/punctuation
    const cleaned = raw
      .replace(/<think>[\s\S]*?<\/think>\s*/g, '')
      .replace(/^[\s"'`*]+|[\s"'`*.,!]+$/g, '')
      .trim();

    if (!cleaned) {
      console.warn('[LLM] Categorization returned empty response after cleanup');
      return this.fallback(categories);
    }

    const lower = cleaned.toLowerCase();

    // 1. Exact match (case-insensitive)
    const exact = categories.find((c) => c.name.toLowerCase() === lower);
    if (exact) return { categoryId: exact.id, categoryName: exact.name, confidence: 0.9 };

    // 2. Response contains a category name (e.g. "The category is Food")
    const contained = categories.find((c) => lower.includes(c.name.toLowerCase()));
    if (contained) return { categoryId: contained.id, categoryName: contained.name, confidence: 0.8 };

    // 3. Category name contains the response (e.g. response "food" matches "Food & Dining")
    const partial = categories.find((c) => c.name.toLowerCase().includes(lower));
    if (partial) return { categoryId: partial.id, categoryName: partial.name, confidence: 0.7 };

    // 4. Try to parse as JSON in case model returned it anyway
    try {
      const parsed = JSON.parse(cleaned);
      const name = parsed.categoryName ?? parsed.category ?? parsed.name;
      if (name) {
        const jsonMatch = categories.find(
          (c) => c.name.toLowerCase() === String(name).toLowerCase(),
        );
        if (jsonMatch) return { categoryId: jsonMatch.id, categoryName: jsonMatch.name, confidence: 0.8 };
      }
    } catch { /* not JSON, that's fine */ }

    console.warn(`[LLM] Could not match category from response: "${cleaned.slice(0, 100)}"`);
    return this.fallback(categories);
  }

  private fallback(categories: CategoryInfo[]): MatchResult {
    const other = categories.find((c) => c.name.toLowerCase() === 'other');
    const fb = other ?? categories[0];
    if (!fb) throw new Error('No categories available');
    return { categoryId: fb.id, categoryName: fb.name, confidence: 0.1 };
  }
}
