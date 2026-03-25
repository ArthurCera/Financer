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

  async getDashboard(userId: string, month?: number, year?: number): Promise<DashboardResponse> {
    const cacheKey = `dashboard:${userId}:${year ?? 'all'}:${month ?? 'all'}`;
    const cached = await this.cache.get<DashboardResponse>(cacheKey);
    if (cached) return cached;

    const [totalExpenses, totalIncome, totalBudget, recentExpenses, llmStats, allTimeNetSavings] = await Promise.all([
      this.repo.getTotalExpenses(userId, month, year),
      this.repo.getTotalIncome(userId, month, year),
      this.repo.getTotalBudget(userId, month, year),
      this.repo.getRecentExpenses(userId, month, year),
      this.repo.getUserLLMStats(userId),
      this.repo.getAllTimeNetSavings(userId),
    ]);

    const expensesByCategoryRaw = await this.repo.getExpensesByCategory(userId, month, year);
    const budgetVsActualRaw = await this.repo.getBudgetVsActual(userId, month, year, expensesByCategoryRaw);

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
      period: { month: month ?? 0, year: year ?? 0 },
      totalExpenses,
      totalIncome,
      totalBudget,
      allTimeNetSavings,
      expensesByCategory,
      budgetVsActual,
      recentExpenses,
      llmStats: {
        chatMessageCount: llmStats.chatMessageCount,
        categorizationsCount: llmStats.categorizationsCount,
        lastChatAt: llmStats.lastChatAt?.toISOString() ?? null,
      },
    };

    await this.cache.set(cacheKey, result, 300);

    return result;
  }
}
