import { injectable, inject } from 'tsyringe';
import { ICacheService } from '@financer/backend-shared';
import { DashboardResponse, CategoryBreakdownResponse, BudgetComparisonResponse } from '@financer/shared';
import { DashboardRepository } from '../repositories/DashboardRepository';

@injectable()
export class DashboardService {
  constructor(
    @inject('DashboardRepository') private readonly repo: DashboardRepository,
    @inject('ICacheService') private readonly cache: ICacheService,
  ) {}

  async getDashboard(userId: string, month: number, year: number): Promise<DashboardResponse> {
    const cacheKey = `dashboard:${userId}:${year}:${month}`;
    const cached = await this.cache.get<DashboardResponse>(cacheKey);
    if (cached) return cached;

    const [totalExpenses, totalIncome, totalBudget] = await Promise.all([
      this.repo.getTotalExpenses(userId, month, year),
      this.repo.getTotalIncome(userId, month, year),
      this.repo.getTotalBudget(userId, month, year),
    ]);

    const expensesByCategoryRaw = await this.repo.getExpensesByCategory(userId, month, year);
    const budgetVsActualRaw = await this.repo.getBudgetVsActual(userId, month, year);

    const expensesByCategory: CategoryBreakdownResponse[] = expensesByCategoryRaw.map((item) => ({
      categoryId: item.categoryId ?? 'uncategorized',
      categoryName: item.categoryName ?? 'Uncategorized',
      color: item.color ?? '#6B7280',
      total: item.total,
      percentage: totalExpenses > 0 ? Math.round((item.total / totalExpenses) * 100) : 0,
    }));

    const budgetVsActual: BudgetComparisonResponse[] = budgetVsActualRaw.map((item) => ({
      categoryId: item.categoryId,
      categoryName: item.categoryName ?? 'Unknown',
      budgeted: item.budgeted,
      spent: item.spent,
      remaining: item.remaining,
      percentage: item.percentage,
    }));

    const result: DashboardResponse = {
      period: { month, year },
      totalExpenses,
      totalIncome,
      totalBudget,
      expensesByCategory,
      budgetVsActual,
    };

    await this.cache.set(cacheKey, result, 300);

    return result;
  }
}
