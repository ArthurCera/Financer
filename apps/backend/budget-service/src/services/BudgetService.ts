import { injectable, inject } from 'tsyringe';
import {
  IBudgetRepository,
  ICategoryRepository,
  ICacheService,
  BudgetDto,
  CategoryDto,
  AppError,
  NotFoundError,
  findOwnedOrThrow,
  invalidateDashboardCache,
} from '@financer/backend-shared';
import { CreateBudgetRequest, UpdateBudgetRequest, BudgetResponse } from '@financer/shared';

@injectable()
export class BudgetService {
  constructor(
    @inject('IBudgetRepository') private readonly budgetRepo: IBudgetRepository,
    @inject('ICategoryRepository') private readonly categoryRepo: ICategoryRepository,
    @inject('ICacheService') private readonly cache: ICacheService,
  ) {}

  async list(
    userId: string,
    month: number,
    year: number,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ items: BudgetResponse[]; total: number }> {
    const [budgetList, total] = await Promise.all([
      this.budgetRepo.findByUserAndPeriodPaginated(userId, month, year, limit, offset),
      this.budgetRepo.countByUserAndPeriod(userId, month, year),
    ]);

    // Batch-fetch all categories in a single query
    const categoryIds = [...new Set(budgetList.map((b) => b.categoryId).filter(Boolean))] as string[];
    const categoryList = await this.categoryRepo.findByIds(categoryIds);
    const categoryMap = new Map<string, CategoryDto>();
    for (const cat of categoryList) {
      categoryMap.set(cat.id, cat);
    }

    const items = budgetList.map((budget) => {
      const category = budget.categoryId ? categoryMap.get(budget.categoryId) ?? null : null;
      return this.toResponse(budget, category?.name ?? null);
    });

    return { items, total };
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

    await invalidateDashboardCache(this.cache, userId);
    return this.toResponse(budget, categoryName);
  }

  async update(
    userId: string,
    id: string,
    data: UpdateBudgetRequest,
  ): Promise<BudgetResponse> {
    await findOwnedOrThrow(this.budgetRepo, id, userId, 'Budget');

    const partial: Partial<Omit<BudgetDto, 'id' | 'createdAt'>> = {};
    if (data.amount !== undefined) partial.amount = data.amount;

    const updated = await this.budgetRepo.update(id, partial);

    let categoryName: string | null = null;
    if (updated.categoryId) {
      const category = await this.categoryRepo.findById(updated.categoryId);
      categoryName = category?.name ?? null;
    }

    await invalidateDashboardCache(this.cache, userId);
    return this.toResponse(updated, categoryName);
  }

  async remove(userId: string, id: string): Promise<void> {
    await findOwnedOrThrow(this.budgetRepo, id, userId, 'Budget');
    await this.budgetRepo.delete(id);
    await invalidateDashboardCache(this.cache, userId);
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
      updatedAt: budget.updatedAt.toISOString(),
    };
  }
}
