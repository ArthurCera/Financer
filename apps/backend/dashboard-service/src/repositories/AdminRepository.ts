import { injectable, inject } from 'tsyringe';
import {
  users,
  expenses,
  incomes,
  llmChats,
  categories,
  count,
  sum,
  eq,
  and,
  gte,
  lt,
  desc,
  sql,
  inArray,
  getMonthPeriodDates,
  type DrizzleDB,
} from '@financer/backend-shared';

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  managedBy: string | null;
  createdAt: Date;
  expenseCount: number;
  totalSpent: number;
}

export interface AdminStats {
  totalUsers: number;
  totalExpenses: number;
  totalExpenseAmount: number;
  totalIncome: number;
  totalLLMChats: number;
}

export interface LLMUsageRow {
  userId: string;
  email: string;
  name: string;
  chatMessageCount: number;
  lastChatAt: Date | null;
}

@injectable()
export class AdminRepository {
  constructor(@inject('db') private readonly db: DrizzleDB) {}

  async getUsers(adminId?: string): Promise<AdminUserRow[]> {
    let query = this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        managedBy: users.managedBy,
        createdAt: users.createdAt,
        expenseCount: sql<number>`COALESCE((SELECT COUNT(*) FROM expenses WHERE expenses.user_id = ${users.id}), 0)`,
        totalSpent: sql<number>`COALESCE((SELECT SUM(amount) FROM expenses WHERE expenses.user_id = ${users.id}), 0)`,
      })
      .from(users);

    // Admin sees only their sub-accounts; superadmin sees all
    if (adminId) {
      query = query.where(eq(users.managedBy, adminId)) as typeof query;
    }

    const rows = await query;

    return rows.map((r: any) => ({
      id: r.id as string,
      email: r.email as string,
      name: r.name as string,
      role: r.role as string,
      managedBy: (r.managedBy as string) ?? null,
      createdAt: r.createdAt as Date,
      expenseCount: Number(r.expenseCount),
      totalSpent: parseFloat(String(r.totalSpent)),
    }));
  }

  async getSubAccounts(adminId: string): Promise<AdminUserRow[]> {
    return this.getUsers(adminId);
  }

  async createSubAccount(
    adminId: string,
    email: string,
    passwordHash: string,
    name: string,
  ): Promise<AdminUserRow> {
    const rows = await this.db
      .insert(users)
      .values({
        email,
        passwordHash,
        name,
        role: 'user',
        managedBy: adminId,
      })
      .returning();

    const r = rows[0]!;
    return {
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role,
      managedBy: r.managedBy ?? null,
      createdAt: r.createdAt,
      expenseCount: 0,
      totalSpent: 0,
    };
  }

  async getStats(scopedUserIds?: string[]): Promise<AdminStats> {
    if (scopedUserIds && scopedUserIds.length > 0) {
      // Admin: scoped stats for managed sub-accounts
      const [[expenseCount], [incomeTotal], [chatCount], [expenseAmountTotal]] = await Promise.all([
        this.db.select({ total: count() }).from(expenses).where(inArray(expenses.userId, scopedUserIds)),
        this.db.select({ total: sum(incomes.amount) }).from(incomes).where(inArray(incomes.userId, scopedUserIds)),
        this.db.select({ total: count() }).from(llmChats).where(inArray(llmChats.userId, scopedUserIds)),
        this.db.select({ total: sum(expenses.amount) }).from(expenses).where(inArray(expenses.userId, scopedUserIds)),
      ]);
      return {
        totalUsers: scopedUserIds.length,
        totalExpenses: Number(expenseCount?.total ?? 0),
        totalExpenseAmount: parseFloat(String(expenseAmountTotal?.total ?? '0')),
        totalIncome: parseFloat(String(incomeTotal?.total ?? '0')),
        totalLLMChats: Number(chatCount?.total ?? 0),
      };
    }

    // Superadmin: global stats
    const [[userCount], [expenseCount], [incomeTotal], [chatCount], [expenseAmountTotal]] = await Promise.all([
      this.db.select({ total: count() }).from(users),
      this.db.select({ total: count() }).from(expenses),
      this.db.select({ total: sum(incomes.amount) }).from(incomes),
      this.db.select({ total: count() }).from(llmChats),
      this.db.select({ total: sum(expenses.amount) }).from(expenses),
    ]);

    return {
      totalUsers: Number(userCount?.total ?? 0),
      totalExpenses: Number(expenseCount?.total ?? 0),
      totalExpenseAmount: parseFloat(String(expenseAmountTotal?.total ?? '0')),
      totalIncome: parseFloat(String(incomeTotal?.total ?? '0')),
      totalLLMChats: Number(chatCount?.total ?? 0),
    };
  }

  async getLLMUsage(): Promise<{ users: LLMUsageRow[]; totalMessages: number }> {
    const rows = await this.db
      .select({
        userId: users.id,
        email: users.email,
        name: users.name,
        chatMessageCount: sql<number>`COALESCE((SELECT COUNT(*) FROM llm_chats WHERE llm_chats.user_id = ${users.id}), 0)`,
        lastChatAt: sql<Date | null>`(SELECT MAX(created_at) FROM llm_chats WHERE llm_chats.user_id = ${users.id})`,
      })
      .from(users);

    const usageRows: LLMUsageRow[] = rows.map((r: any) => ({
      userId: r.userId as string,
      email: r.email as string,
      name: r.name as string,
      chatMessageCount: Number(r.chatMessageCount),
      lastChatAt: r.lastChatAt as Date | null,
    }));

    const totalMessages = usageRows.reduce((s, r) => s + r.chatMessageCount, 0);

    return { users: usageRows, totalMessages };
  }

  async getDetailedLLMStats(): Promise<{
    totalChats: number;
    totalMessages: number;
    avgMessagesPerUser: number;
    activeUsersLast7Days: number;
    messagesLast7Days: number;
    messagesLast30Days: number;
    topUsers: Array<{ userId: string; name: string; email: string; messageCount: number }>;
  }> {
    const [
      [totalMsgRow],
      [distinctChatUsersRow],
      [active7Row],
      [msg7Row],
      [msg30Row],
      topUserRows,
    ] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(llmChats),
      this.db
        .select({ total: sql<number>`COUNT(DISTINCT user_id)` })
        .from(llmChats),
      this.db
        .select({ total: sql<number>`COUNT(DISTINCT user_id)` })
        .from(llmChats)
        .where(sql`${llmChats.createdAt} >= NOW() - INTERVAL '7 days'`),
      this.db
        .select({ total: count() })
        .from(llmChats)
        .where(sql`${llmChats.createdAt} >= NOW() - INTERVAL '7 days'`),
      this.db
        .select({ total: count() })
        .from(llmChats)
        .where(sql`${llmChats.createdAt} >= NOW() - INTERVAL '30 days'`),
      this.db
        .select({
          userId: users.id,
          name: users.name,
          email: users.email,
          messageCount: sql<number>`COUNT(${llmChats.id})`,
        })
        .from(llmChats)
        .innerJoin(users, eq(llmChats.userId, users.id))
        .groupBy(users.id, users.name, users.email)
        .orderBy(sql`COUNT(${llmChats.id}) DESC`)
        .limit(10),
    ]);

    const totalMessages = Number(totalMsgRow?.total ?? 0);
    const totalChats = Number(distinctChatUsersRow?.total ?? 0);
    const avgMessagesPerUser = totalChats > 0 ? Math.round((totalMessages / totalChats) * 100) / 100 : 0;

    return {
      totalChats,
      totalMessages,
      avgMessagesPerUser,
      activeUsersLast7Days: Number(active7Row?.total ?? 0),
      messagesLast7Days: Number(msg7Row?.total ?? 0),
      messagesLast30Days: Number(msg30Row?.total ?? 0),
      topUsers: topUserRows.map((r: any) => ({
        userId: r.userId as string,
        name: r.name as string,
        email: r.email as string,
        messageCount: Number(r.messageCount),
      })),
    };
  }

  async getPeriodTotals(scopedUserIds?: string[], month?: number, year?: number): Promise<{ totalIncome: number; totalExpenseAmount: number }> {
    const incomeConditions: any[] = [];
    const expenseConditions: any[] = [];
    if (scopedUserIds && scopedUserIds.length > 0) {
      incomeConditions.push(inArray(incomes.userId, scopedUserIds));
      expenseConditions.push(inArray(expenses.userId, scopedUserIds));
    }
    if (month && year) {
      const { start, end } = getMonthPeriodDates(month, year);
      incomeConditions.push(gte(incomes.date, start), lt(incomes.date, end));
      expenseConditions.push(gte(expenses.date, start), lt(expenses.date, end));
    }

    const [[incomeRow], [expenseRow]] = await Promise.all([
      incomeConditions.length > 0
        ? this.db.select({ total: sum(incomes.amount) }).from(incomes).where(and(...incomeConditions))
        : this.db.select({ total: sum(incomes.amount) }).from(incomes),
      expenseConditions.length > 0
        ? this.db.select({ total: sum(expenses.amount) }).from(expenses).where(and(...expenseConditions))
        : this.db.select({ total: sum(expenses.amount) }).from(expenses),
    ]);

    return {
      totalIncome: parseFloat(String(incomeRow?.total ?? '0')),
      totalExpenseAmount: parseFloat(String(expenseRow?.total ?? '0')),
    };
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    await this.db.update(users).set({ role }).where(eq(users.id, userId));
  }

  async getExpensesByCategory(scopedUserIds?: string[], month?: number, year?: number): Promise<{
    categoryId: string | null;
    categoryName: string | null;
    color: string | null;
    total: number;
  }[]> {
    const conditions: any[] = [];
    if (scopedUserIds && scopedUserIds.length > 0) {
      conditions.push(inArray(expenses.userId, scopedUserIds));
    }
    if (month && year) {
      const { start, end } = getMonthPeriodDates(month, year);
      conditions.push(gte(expenses.date, start), lt(expenses.date, end));
    }

    let query = this.db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        color: categories.color,
        total: sum(expenses.amount),
      })
      .from(expenses)
      .leftJoin(categories, eq(expenses.categoryId, categories.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const rows = await query.groupBy(categories.id, categories.name, categories.color);

    return rows.map((r: any) => ({
      categoryId: (r.categoryId as string) ?? null,
      categoryName: (r.categoryName as string) ?? null,
      color: (r.color as string) ?? null,
      total: parseFloat(String(r.total ?? 0)),
    }));
  }

  async getCategoryCounts(scopedUserIds?: string[], month?: number, year?: number): Promise<{
    categoryName: string;
    color: string;
    count: number;
  }[]> {
    const conditions: any[] = [];
    if (scopedUserIds && scopedUserIds.length > 0) {
      conditions.push(inArray(expenses.userId, scopedUserIds));
    }
    if (month && year) {
      const { start, end } = getMonthPeriodDates(month, year);
      conditions.push(gte(expenses.date, start), lt(expenses.date, end));
    }

    let query = this.db
      .select({
        categoryName: categories.name,
        color: categories.color,
        total: count(expenses.id),
      })
      .from(expenses)
      .innerJoin(categories, eq(expenses.categoryId, categories.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const rows = await query.groupBy(categories.name, categories.color);

    return rows.map((r: any) => ({
      categoryName: r.categoryName as string,
      color: r.color as string,
      count: Number(r.total),
    }));
  }

  async getIncomes(userId: string, month?: number, year?: number): Promise<{
    id: string;
    amount: number;
    description: string | null;
    source: string | null;
    date: string;
    createdAt: Date;
    updatedAt: Date;
  }[]> {
    const conditions = [eq(incomes.userId, userId)];
    if (month && year) {
      const { start, end } = getMonthPeriodDates(month, year);
      conditions.push(gte(incomes.date, start), lt(incomes.date, end));
    }

    const rows = await this.db
      .select({
        id: incomes.id,
        amount: incomes.amount,
        description: incomes.description,
        source: incomes.source,
        date: incomes.date,
        createdAt: incomes.createdAt,
        updatedAt: incomes.updatedAt,
      })
      .from(incomes)
      .where(and(...conditions))
      .orderBy(desc(incomes.date));

    return rows.map((r: any) => ({
      id: r.id as string,
      amount: parseFloat(String(r.amount)),
      description: r.description ?? null,
      source: r.source ?? null,
      date: r.date as string,
      createdAt: r.createdAt as Date,
      updatedAt: r.updatedAt as Date,
    }));
  }

  async getChatHistory(userId: string): Promise<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
  }[]> {
    const rows = await this.db
      .select({
        id: llmChats.id,
        role: llmChats.role,
        content: llmChats.content,
        createdAt: llmChats.createdAt,
      })
      .from(llmChats)
      .where(eq(llmChats.userId, userId))
      .orderBy(sql`${llmChats.createdAt} DESC`)
      .limit(50);

    return rows.map((r: any) => ({
      id: r.id as string,
      role: r.role as 'user' | 'assistant',
      content: r.content as string,
      createdAt: (r.createdAt as Date).toISOString(),
    }));
  }
}
