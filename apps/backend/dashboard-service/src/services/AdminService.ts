import { injectable, inject } from 'tsyringe';
import type { AdminStatsResponse, AdminUserResponse, AdminLLMUsageResponse } from '@financer/shared';
import { AdminRepository } from '../repositories/AdminRepository';

@injectable()
export class AdminService {
  constructor(
    @inject('AdminRepository') private readonly repo: AdminRepository,
  ) {}

  async getUsers(): Promise<AdminUserResponse[]> {
    const rows = await this.repo.getUsers();
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role as 'user' | 'admin',
      createdAt: r.createdAt.toISOString(),
      expenseCount: r.expenseCount,
      totalSpent: r.totalSpent,
    }));
  }

  async getStats(): Promise<AdminStatsResponse> {
    const stats = await this.repo.getStats();
    return {
      totalUsers: stats.totalUsers,
      totalExpenses: stats.totalExpenses,
      totalIncome: stats.totalIncome,
      totalLLMChats: stats.totalLLMChats,
      totalCategorizationsRun: 0, // TODO: track categorizations separately if needed
    };
  }

  async getLLMUsage(): Promise<AdminLLMUsageResponse> {
    const { users, totalMessages } = await this.repo.getLLMUsage();
    return {
      users: users.map((u) => ({
        userId: u.userId,
        email: u.email,
        name: u.name,
        chatMessageCount: u.chatMessageCount,
        lastChatAt: u.lastChatAt?.toISOString() ?? null,
      })),
      totalMessages,
    };
  }
}
