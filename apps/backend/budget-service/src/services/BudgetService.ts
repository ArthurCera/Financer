import { injectable, inject } from 'tsyringe';
import {
  IBudgetRepository,
  ICategoryRepository,
  BudgetDto,
  CategoryDto,
  AppError,
  NotFoundError,
} from '@financer/backend-shared';
import { CreateBudgetRequest, UpdateBudgetRequest, BudgetResponse } from '@financer/shared';

@injectable()
export class BudgetService {
  constructor(
    @inject('IBudgetRepository') private readonly budgetRepo: IBudgetRepository,
    @inject('ICategoryRepository') private readonly categoryRepo: ICategoryRepository,
  ) {}

  async list(userId: string, month: number, year: number): Promise<BudgetResponse[]> {
    const budgetList = await this.budgetRepo.findByUserAndPeriod(userId, month, year);

    const categoryIds = [...new Set(budgetList.map((b) => b.categoryId).filter(Boolean))] as string[];
    const categoryMap = new Map<string, CategoryDto>();
    for (const categoryId of categoryIds) {
      const category = await this.categoryRepo.findById(categoryId);
      if (category) categoryMap.set(categoryId, category);
    }

    return budgetList.map((budget) => {
      const category = budget.categoryId ? categoryMap.get(budget.categoryId) ?? null : null;
      return this.toResponse(budget, category?.name ?? null);
    });
  }

  async create(userId: string, data: CreateBudgetRequest): Promise<BudgetResponse> {
    if (data.categoryId) {
      const category = await this.categoryRepo.findById(data.categoryId);
      if (!category) throw new NotFoundError('Category', data.categoryId);
    }

    const existing = await this.budgetRepo.findByUserAndPeriod(userId, data.month, data.year);
    const duplicate = existing.find((b) => b.categoryId === (data.categoryId ?? null));
    if (duplicate) {
      throw new AppError('Budget already exists for this category/period', 409, 'CONFLICT');
    }

    const budget = await this.budgetRepo.save({
      userId,
      categoryId: data.categoryId ?? null,
      amount: data.amount,
      month: data.month,
      year: data.year,
    });

    let categoryName: string | null = null;
    if (budget.categoryId) {
      const category = await this.categoryRepo.findById(budget.categoryId);
      categoryName = category?.name ?? null;
    }

    return this.toResponse(budget, categoryName);
  }

  async update(
    userId: string,
    id: string,
    data: UpdateBudgetRequest,
  ): Promise<BudgetResponse> {
    const existing = await this.budgetRepo.findById(id);
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError('Budget', id);
    }

    const partial: Partial<Omit<BudgetDto, 'id' | 'createdAt'>> = {};
    if (data.amount !== undefined) partial.amount = data.amount;

    const updated = await this.budgetRepo.update(id, partial);

    let categoryName: string | null = null;
    if (updated.categoryId) {
      const category = await this.categoryRepo.findById(updated.categoryId);
      categoryName = category?.name ?? null;
    }

    return this.toResponse(updated, categoryName);
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.budgetRepo.findById(id);
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError('Budget', id);
    }
    await this.budgetRepo.delete(id);
  }

  toResponse(budget: BudgetDto, categoryName?: string | null): BudgetResponse {
    return {
      id: budget.id,
      userId: budget.userId,
      categoryId: budget.categoryId,
      categoryName: categoryName ?? null,
      amount: budget.amount,
      month: budget.month,
      year: budget.year,
      createdAt: budget.createdAt.toISOString(),
    };
  }
}
