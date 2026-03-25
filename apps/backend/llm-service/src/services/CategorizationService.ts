import { injectable, inject } from 'tsyringe';
import {
  ILLMProvider,
  IQueueService,
  ICategoryRepository,
  IExpenseRepository,
  NotFoundError,
  CategoryDto,
  ExpenseDto,
} from '@financer/backend-shared';
import type { CategorizeResponse } from '@financer/shared';
import { CategorizeResponseSchema } from '../validators/llm.validator';
import { CATEGORIZE_SYSTEM } from '../prompts';

type CategoryInfo = Pick<CategoryDto, 'id' | 'name'>;

interface BatchJob {
  userId: string;
  month: number;
  year: number;
}

const BATCH_CONCURRENCY = 3;

@injectable()
export class CategorizationService {
  constructor(
    @inject('ILLMProvider') private readonly llmProvider: ILLMProvider,
    @inject('IQueueService') private readonly queueService: IQueueService,
    @inject('ICategoryRepository') private readonly categoryRepo: ICategoryRepository,
    @inject('IExpenseRepository') private readonly expenseRepo: IExpenseRepository,
  ) {}

  async categorize(userId: string, expenseId: string): Promise<CategorizeResponse> {
    const expense = await this.expenseRepo.findById(expenseId);
    if (!expense || expense.userId !== userId) {
      throw new NotFoundError('Expense', expenseId);
    }

    const allCategories = await this.categoryRepo.findAll();

    const prompt = this.buildPrompt(
      expense.description ?? 'No description',
      expense.amount,
      expense.date instanceof Date ? expense.date.toISOString().split('T')[0] : String(expense.date),
      allCategories,
    );

    const rawResponse = await this.llmProvider.complete(prompt, {
      systemPrompt: CATEGORIZE_SYSTEM,
      temperature: 0.1,
    });

    const parsed = this.parseResponse(rawResponse, allCategories);

    await this.expenseRepo.update(expenseId, { categoryId: parsed.categoryId });

    return {
      expenseId,
      categoryId: parsed.categoryId,
      categoryName: parsed.categoryName,
      confidence: parsed.confidence,
    };
  }

  async categorizeBatch(userId: string, month: number, year: number): Promise<void> {
    const job: BatchJob = { userId, month, year };
    await this.queueService.publish('llm.categorize-batch', job);
  }

  async processBatchJob(job: BatchJob): Promise<void> {
    const { userId, month, year } = job;

    const uncategorized = await this.expenseRepo.findUncategorizedByUserAndPeriod(userId, month, year);
    const allCategories = await this.categoryRepo.findAll();

    for (let i = 0; i < uncategorized.length; i += BATCH_CONCURRENCY) {
      const batch = uncategorized.slice(i, i + BATCH_CONCURRENCY);
      await Promise.allSettled(
        batch.map((expense) => this.categorizeOne(expense, allCategories)),
      );
    }
  }

  async startBatchWorker(): Promise<void> {
    await this.queueService.consume<BatchJob>('llm.categorize-batch', async (job) => {
      await this.processBatchJob(job);
    });
  }

  private async categorizeOne(
    expense: ExpenseDto,
    allCategories: CategoryInfo[],
  ): Promise<void> {
    try {
      const dateStr = expense.date instanceof Date
        ? expense.date.toISOString().split('T')[0]
        : String(expense.date);

      const prompt = this.buildPrompt(
        expense.description ?? 'No description',
        expense.amount,
        dateStr,
        allCategories,
      );

      const rawResponse = await this.llmProvider.complete(prompt, {
        systemPrompt: CATEGORIZE_SYSTEM,
        temperature: 0.1,
      });

      const parsed = this.parseResponse(rawResponse, allCategories);

      await this.expenseRepo.update(expense.id, { categoryId: parsed.categoryId });
    } catch (error) {
      console.error(`[LLM] Failed to categorize expense ${expense.id}:`, error);
    }
  }

  private buildPrompt(
    description: string,
    amount: number,
    date: string,
    categoryList: CategoryInfo[],
  ): string {
    const categoriesJson = categoryList.map((c) => ({ id: c.id, name: c.name }));
    return `Expense: "${description}", amount: $${amount.toFixed(2)}, date: ${date}\n\nAvailable categories:\n${JSON.stringify(categoriesJson, null, 2)}`;
  }

  private parseResponse(
    raw: string,
    allCategories: CategoryInfo[],
  ): { categoryId: string; categoryName: string; confidence: number } {
    try {
      const parsed = JSON.parse(raw);
      const validated = CategorizeResponseSchema.safeParse(parsed);
      if (validated.success) {
        const found = allCategories.find((c) => c.id === validated.data.categoryId);
        if (found) return validated.data;
      }

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

    const otherCat = allCategories.find((c) => c.name.toLowerCase() === 'other');
    const fallback = otherCat ?? allCategories[0];
    if (!fallback) {
      throw new Error('No categories available for fallback categorization');
    }
    return { categoryId: fallback.id, categoryName: fallback.name, confidence: 0.1 };
  }
}
