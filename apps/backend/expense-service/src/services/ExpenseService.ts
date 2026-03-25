import { injectable, inject } from 'tsyringe';
import {
  IExpenseRepository,
  ICategoryRepository,
  ICacheService,
  ExpenseDto,
  CategoryDto,
  NotFoundError,
  findOwnedOrThrow,
  invalidateDashboardCache,
} from '@financer/backend-shared';
import { CreateExpenseRequest, UpdateExpenseRequest, ExpenseResponse } from '@financer/shared';

@injectable()
export class ExpenseService {
  constructor(
    @inject('IExpenseRepository') private readonly expenseRepo: IExpenseRepository,
    @inject('ICategoryRepository') private readonly categoryRepo: ICategoryRepository,
    @inject('ICacheService') private readonly cache: ICacheService,
  ) {}

  async list(
    userId: string,
    month?: number,
    year?: number,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ items: ExpenseResponse[]; total: number }> {
    let expenseList: ExpenseDto[];
    let total: number;

    if (month !== undefined && year !== undefined) {
      [expenseList, total] = await Promise.all([
        this.expenseRepo.findByUserAndPeriodPaginated(userId, month, year, limit, offset),
        this.expenseRepo.countByUserAndPeriod(userId, month, year),
      ]);
    } else {
      [expenseList, total] = await Promise.all([
        this.expenseRepo.findByUserPaginated(userId, limit, offset),
        this.expenseRepo.countByUser(userId),
      ]);
    }

    // Batch-fetch all categories in a single query
    const categoryIds = [...new Set(expenseList.map((e) => e.categoryId).filter(Boolean))] as string[];
    const categoryList = await this.categoryRepo.findByIds(categoryIds);
    const categoryMap = new Map<string, CategoryDto>();
    for (const cat of categoryList) {
      categoryMap.set(cat.id, cat);
    }

    const items = expenseList.map((expense) => {
      const category = expense.categoryId ? categoryMap.get(expense.categoryId) ?? null : null;
      return this.toResponse(expense, category?.name ?? null);
    });

    return { items, total };
  }

  async create(userId: string, data: CreateExpenseRequest): Promise<ExpenseResponse> {
    let categoryName: string | null = null;
    if (data.categoryId) {
      const category = await this.categoryRepo.findById(data.categoryId);
      if (!category) throw new NotFoundError('Category', data.categoryId);
      categoryName = category.name;
    }

    const expense = await this.expenseRepo.save({
      userId,
      categoryId: data.categoryId ?? null,
      amount: data.amount,
      description: data.description ?? null,
      date: new Date(data.date) as unknown as Date,
    });

    await invalidateDashboardCache(this.cache, userId);
    return this.toResponse(expense, categoryName);
  }

  async update(
    userId: string,
    id: string,
    data: UpdateExpenseRequest,
  ): Promise<ExpenseResponse> {
    await findOwnedOrThrow(this.expenseRepo, id, userId, 'Expense');

    if (data.categoryId) {
      const category = await this.categoryRepo.findById(data.categoryId);
      if (!category) throw new NotFoundError('Category', data.categoryId);
    }

    const partial: Partial<Omit<ExpenseDto, 'id' | 'createdAt'>> = {};
    if (data.amount !== undefined) partial.amount = data.amount;
    if (data.categoryId !== undefined) partial.categoryId = data.categoryId;
    if (data.description !== undefined) partial.description = data.description;
    if (data.date !== undefined) partial.date = new Date(data.date) as unknown as Date;

    const updated = await this.expenseRepo.update(id, partial);

    let categoryName: string | null = null;
    if (updated.categoryId) {
      const category = await this.categoryRepo.findById(updated.categoryId);
      categoryName = category?.name ?? null;
    }

    await invalidateDashboardCache(this.cache, userId);
    return this.toResponse(updated, categoryName);
  }

  async remove(userId: string, id: string): Promise<void> {
    await findOwnedOrThrow(this.expenseRepo, id, userId, 'Expense');
    await this.expenseRepo.delete(id);
    await invalidateDashboardCache(this.cache, userId);
  }

  toResponse(expense: ExpenseDto, categoryName?: string | null): ExpenseResponse {
    const dateStr =
      expense.date instanceof Date
        ? expense.date.toISOString().split('T')[0]
        : String(expense.date);

    return {
      id: expense.id,
      userId: expense.userId,
      categoryId: expense.categoryId,
      categoryName: categoryName ?? null,
      amount: expense.amount,
      description: expense.description,
      date: dateStr,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }
}
