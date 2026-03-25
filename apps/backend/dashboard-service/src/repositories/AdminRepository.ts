import { injectable, inject } from 'tsyringe';
import {
  users,
  expenses,
  incomes,
  llmChats,
  count,
  sum,
  eq,
  sql,
  type DrizzleDB,
} from '@financer/backend-shared';

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
  expenseCount: number;
  totalSpent: number;
}

export interface AdminStats {
  totalUsers: number;
  totalExpenses: number;
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

  async getUsers(): Promise<AdminUserRow[]> {
    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
        expenseCount: sql<number>`COALESCE((SELECT COUNT(*) FROM expenses WHERE expenses.user_id = ${users.id}), 0)`,
        totalSpent: sql<number>`COALESCE((SELECT SUM(amount) FROM expenses WHERE expenses.user_id = ${users.id}), 0)`,
      })
      .from(users);

    return rows.map((r: any) => ({
      id: r.id as string,
      email: r.email as string,
      name: r.name as string,
      role: r.role as string,
      createdAt: r.createdAt as Date,
      expenseCount: Number(r.expenseCount),
      totalSpent: parseFloat(String(r.totalSpent)),
    }));
  }

  async getStats(): Promise<AdminStats> {
    const [[userCount], [expenseCount], [incomeTotal], [chatCount]] = await Promise.all([
      this.db.select({ total: count() }).from(users),
      this.db.select({ total: count() }).from(expenses),
      this.db.select({ total: sum(incomes.amount) }).from(incomes),
      this.db.select({ total: count() }).from(llmChats),
    ]);

    return {
      totalUsers: Number(userCount?.total ?? 0),
      totalExpenses: Number(expenseCount?.total ?? 0),
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

  async updateUserRole(userId: string, role: 'user' | 'admin'): Promise<void> {
    await this.db.update(users).set({ role }).where(eq(users.id, userId));
  }
}
