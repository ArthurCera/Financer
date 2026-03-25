import { injectable, inject } from 'tsyringe';
import {
  users,
  expenses,
  incomes,
  llmChats,
  count,
  sum,
  sql,
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
  constructor(@inject('db') private readonly db: any) {}

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
}
