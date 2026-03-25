import { injectable, inject } from 'tsyringe';
import {
  expenses,
  incomes,
  budgets,
  categories,
  llmChats,
  eq,
  and,
  gte,
  lt,
  sum,
  count,
  desc,
  sql,
  inArray,
  getMonthPeriodDates,
  type DrizzleDB,
} from '@financer/backend-shared';

interface CategoryExpenseRow {
  categoryId: string | null;
  categoryName: string | null;
  color: string | null;
  total: string | null;
}

interface BudgetRow {
  id: string;
  categoryId: string | null;
  amount: string;
  month: number;
  year: number;
}

export interface CategoryExpenseSummary {
  categoryId: string | null;
  categoryName: string | null;
  color: string | null;
  total: number;
}

export interface BudgetActualSummary {
  categoryId: string | null;
  categoryName: string | null;
  budgeted: number;
  spent: number;
  remaining: number;
  percentage: number;
}

@injectable()
export class DashboardRepository {
  constructor(@inject('db') private readonly db: DrizzleDB) {}

  async getTotalExpenses(userId: string, month?: number, year?: number): Promise<number> {
    const conditions = [eq(expenses.userId, userId)];
    if (month && year) {
      const { start, end } = getMonthPeriodDates(month, year);
      conditions.push(gte(expenses.date, start), lt(expenses.date, end));
    }

    const [row] = await this.db
      .select({ total: sum(expenses.amount) })
      .from(expenses)
      .where(and(...conditions));

    return parseFloat(String(row?.total ?? 0));
  }

  async getTotalIncome(userId: string, month?: number, year?: number): Promise<number> {
    const conditions = [eq(incomes.userId, userId)];
    if (month && year) {
      const { start, end } = getMonthPeriodDates(month, year);
      conditions.push(gte(incomes.date, start), lt(incomes.date, end));
    }

    const [row] = await this.db
      .select({ total: sum(incomes.amount) })
      .from(incomes)
      .where(and(...conditions));

    return parseFloat(String(row?.total ?? 0));
  }

  async getTotalBudget(userId: string, month?: number, year?: number): Promise<number> {
    const conditions = [eq(budgets.userId, userId)];
    if (month && year) {
      conditions.push(eq(budgets.month, month) as any, eq(budgets.year, year) as any);
    }

    const [row] = await this.db
      .select({ total: sum(budgets.amount) })
      .from(budgets)
      .where(and(...conditions));

    return parseFloat(String(row?.total ?? 0));
  }

  async getExpensesByCategory(
    userId: string,
    month?: number,
    year?: number,
  ): Promise<CategoryExpenseSummary[]> {
    const conditions = [eq(expenses.userId, userId)];
    if (month && year) {
      const { start, end } = getMonthPeriodDates(month, year);
      conditions.push(gte(expenses.date, start), lt(expenses.date, end));
    }

    const rows: CategoryExpenseRow[] = await this.db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        color: categories.color,
        total: sum(expenses.amount),
      })
      .from(expenses)
      .leftJoin(categories, eq(expenses.categoryId, categories.id))
      .where(and(...conditions))
      .groupBy(categories.id, categories.name, categories.color);

    return rows.map((r) => ({
      categoryId: r.categoryId ?? null,
      categoryName: r.categoryName ?? null,
      color: r.color ?? null,
      total: parseFloat(String(r.total ?? 0)),
    }));
  }

  async getBudgetVsActual(
    userId: string,
    month?: number,
    year?: number,
    preloadedExpensesByCategory?: CategoryExpenseSummary[],
  ): Promise<BudgetActualSummary[]> {
    const conditions = [eq(budgets.userId, userId)];
    if (month && year) {
      conditions.push(eq(budgets.month, month) as any, eq(budgets.year, year) as any);
    }

    const budgetRows: BudgetRow[] = await this.db
      .select({
        id: budgets.id,
        categoryId: budgets.categoryId,
        amount: budgets.amount,
        month: budgets.month,
        year: budgets.year,
      })
      .from(budgets)
      .where(and(...conditions));

    // Reuse pre-fetched data if available, otherwise query (avoids double scan)
    const expensesByCat = preloadedExpensesByCategory ?? await this.getExpensesByCategory(userId, month, year);
    const expenseMap = new Map<string | null, number>();
    for (const e of expensesByCat) {
      expenseMap.set(e.categoryId, e.total);
    }

    // Batch fetch category names for budgets
    const categoryIds = budgetRows
      .map((b) => b.categoryId)
      .filter((id): id is string => id !== null);

    const categoryNameMap = new Map<string, string>();
    if (categoryIds.length > 0) {
      const catRows = await this.db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(inArray(categories.id, categoryIds));
      for (const row of catRows) {
        categoryNameMap.set(row.id as string, row.name as string);
      }
    }

    return budgetRows.map((budget) => {
      const budgeted = parseFloat(String(budget.amount));
      const spent = expenseMap.get(budget.categoryId) ?? 0;
      const remaining = budgeted - spent;
      const percentage = budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0;
      const categoryName = budget.categoryId
        ? (categoryNameMap.get(budget.categoryId) ?? 'Unknown')
        : 'Total Budget';

      return {
        categoryId: budget.categoryId,
        categoryName,
        budgeted,
        spent,
        remaining,
        percentage,
      };
    });
  }

  async getAllTimeNetSavings(userId: string): Promise<number> {
    const [[incomeRow], [expenseRow]] = await Promise.all([
      this.db.select({ total: sum(incomes.amount) }).from(incomes).where(eq(incomes.userId, userId)),
      this.db.select({ total: sum(expenses.amount) }).from(expenses).where(eq(expenses.userId, userId)),
    ]);
    const totalIncome = parseFloat(String(incomeRow?.total ?? 0));
    const totalExpenses = parseFloat(String(expenseRow?.total ?? 0));
    return totalIncome - totalExpenses;
  }

  async getRecentExpenses(
    userId: string,
    month?: number,
    year?: number,
    limit: number = 10,
  ): Promise<{ id: string; amount: number; description: string | null; categoryName: string | null; categoryColor: string | null; categoryIcon: string | null; date: string }[]> {
    const conditions = [eq(expenses.userId, userId)];
    if (month && year) {
      const { start, end } = getMonthPeriodDates(month, year);
      conditions.push(gte(expenses.date, start), lt(expenses.date, end));
    }

    const rows = await this.db
      .select({
        id: expenses.id,
        amount: expenses.amount,
        description: expenses.description,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
        date: expenses.date,
      })
      .from(expenses)
      .leftJoin(categories, eq(expenses.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(expenses.date))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id as string,
      amount: parseFloat(String(r.amount)),
      description: r.description ?? null,
      categoryName: r.categoryName ?? null,
      categoryColor: r.categoryColor ?? null,
      categoryIcon: r.categoryIcon ?? null,
      date: r.date as string,
    }));
  }

  async getUserLLMStats(
    userId: string,
  ): Promise<{ chatMessageCount: number; categorizationsCount: number; lastChatAt: Date | null }> {
    const [chatRow] = await this.db
      .select({
        messageCount: count(llmChats.id),
        lastChat: sql<string | null>`MAX(${llmChats.createdAt})`,
      })
      .from(llmChats)
      .where(eq(llmChats.userId, userId));

    const [catRow] = await this.db
      .select({ catCount: count(expenses.id) })
      .from(expenses)
      .where(and(eq(expenses.userId, userId), sql`${expenses.categoryId} IS NOT NULL`));

    return {
      chatMessageCount: chatRow?.messageCount ?? 0,
      categorizationsCount: catRow?.catCount ?? 0,
      lastChatAt: chatRow?.lastChat ? new Date(chatRow.lastChat) : null,
    };
  }
}
