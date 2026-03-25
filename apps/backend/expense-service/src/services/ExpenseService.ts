import { injectable, inject } from 'tsyringe';
import {
  IExpenseRepository,
  ICategoryRepository,
  ExpenseDto,
  CategoryDto,
  NotFoundError,
} from '@financer/backend-shared';
import { CreateExpenseRequest, UpdateExpenseRequest, ExpenseResponse } from '@financer/shared';

@injectable()
export class ExpenseService {
  constructor(
    @inject('IExpenseRepository') private readonly expenseRepo: IExpenseRepository,
    @inject('ICategoryRepository') private readonly categoryRepo: ICategoryRepository,
  ) {}

  async list(userId: string, month?: number, year?: number): Promise<ExpenseResponse[]> {
    let expenseList: ExpenseDto[];
    if (month !== undefined && year !== undefined) {
      expenseList = await this.expenseRepo.findByUserAndPeriod(userId, month, year);
    } else {
      expenseList = await this.expenseRepo.findAll({ userId });
    }

    // Build a map of categoryId -> category for efficient lookup
    const categoryIds = [...new Set(expenseList.map((e) => e.categoryId).filter(Boolean))] as string[];
    const categoryMap = new Map<string, CategoryDto>();
    for (const categoryId of categoryIds) {
      const category = await this.categoryRepo.findById(categoryId);
      if (category) categoryMap.set(categoryId, category);
    }

    return expenseList.map((expense) => {
      const category = expense.categoryId ? categoryMap.get(expense.categoryId) ?? null : null;
      return this.toResponse(expense, category?.name ?? null);
    });
  }

  async create(userId: string, data: CreateExpenseRequest): Promise<ExpenseResponse> {
    if (data.categoryId) {
      const category = await this.categoryRepo.findById(data.categoryId);
      if (!category) throw new NotFoundError('Category', data.categoryId);
    }

    const expense = await this.expenseRepo.save({
      userId,
      categoryId: data.categoryId ?? null,
      amount: data.amount,
      description: data.description ?? null,
      date: new Date(data.date) as unknown as Date,
    });

    let categoryName: string | null = null;
    if (expense.categoryId) {
      const category = await this.categoryRepo.findById(expense.categoryId);
      categoryName = category?.name ?? null;
    }

    return this.toResponse(expense, categoryName);
  }

  async update(
    userId: string,
    id: string,
    data: UpdateExpenseRequest,
  ): Promise<ExpenseResponse> {
    const existing = await this.expenseRepo.findById(id);
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError('Expense', id);
    }

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

    return this.toResponse(updated, categoryName);
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.expenseRepo.findById(id);
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError('Expense', id);
    }
    await this.expenseRepo.delete(id);
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
