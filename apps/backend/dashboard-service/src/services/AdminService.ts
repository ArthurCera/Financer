import { injectable, inject } from 'tsyringe';
import bcrypt from 'bcryptjs';
import type {
  AdminStatsResponse,
  AdminUserResponse,
  AdminLLMUsageResponse,
  DetailedLLMStatsResponse,
  SubAccountResponse,
  CategoryBreakdownResponse,
  CategoryCountResponse,
  AdminSubAccountDetailResponse,
  UserRole,
} from '@financer/shared';
import { ForbiddenError, type ICacheService } from '@financer/backend-shared';
import { AdminRepository } from '../repositories/AdminRepository';
import { DashboardService } from './DashboardService';

@injectable()
export class AdminService {
  constructor(
    @inject('AdminRepository') private readonly repo: AdminRepository,
    @inject('DashboardService') private readonly dashboardService: DashboardService,
    @inject('ICacheService') private readonly cache: ICacheService,
  ) {}

  private async getScopedUserIds(callerRole: `${UserRole}`, callerId: string): Promise<string[]> {
    if (callerRole === 'admin') {
      const subAccounts = await this.repo.getSubAccounts(callerId);
      const ids = subAccounts.map((s) => s.id);
      ids.push(callerId);
      return ids;
    }
    // superadmin: return empty to signal "all users"
    return [];
  }

  async getUsers(callerRole: `${UserRole}`, callerId: string): Promise<AdminUserResponse[]> {
    // Admin sees only their sub-accounts; superadmin sees all
    const adminId = callerRole === 'admin' ? callerId : undefined;
    const rows = await this.repo.getUsers(adminId);
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role as `${UserRole}`,
      managedBy: r.managedBy,
      createdAt: r.createdAt.toISOString(),
      expenseCount: r.expenseCount,
      totalSpent: r.totalSpent,
    }));
  }

  async getStats(callerRole: `${UserRole}`, callerId: string): Promise<AdminStatsResponse> {
    const scopedUserIds = await this.getScopedUserIds(callerRole, callerId);
    const stats = await this.repo.getStats(scopedUserIds.length > 0 ? scopedUserIds : undefined);
    return {
      totalUsers: stats.totalUsers,
      totalExpenses: stats.totalExpenses,
      totalExpenseAmount: stats.totalExpenseAmount,
      totalIncome: stats.totalIncome,
      totalLLMChats: stats.totalLLMChats,
      totalCategorizationsRun: 0,
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

  async getDetailedLLMStats(): Promise<DetailedLLMStatsResponse> {
    return this.repo.getDetailedLLMStats();
  }

  async updateUserRole(callerId: string, callerRole: `${UserRole}`, targetId: string, role: `${UserRole}`): Promise<void> {
    if (targetId === callerId) {
      throw new ForbiddenError('Cannot change own role');
    }
    // Admins can only change roles of their own sub-accounts
    if (callerRole === 'admin') {
      const subAccounts = await this.repo.getSubAccounts(callerId);
      const isOwned = subAccounts.some((s) => s.id === targetId);
      if (!isOwned) {
        throw new ForbiddenError('Not authorized to manage this user');
      }
    }
    await this.repo.updateUserRole(targetId, role);
  }

  async getSubAccounts(adminId: string): Promise<SubAccountResponse[]> {
    const rows = await this.repo.getSubAccounts(adminId);
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      createdAt: r.createdAt.toISOString(),
      expenseCount: r.expenseCount,
      totalSpent: r.totalSpent,
    }));
  }

  async createSubAccount(
    adminId: string,
    email: string,
    password: string,
    name: string,
  ): Promise<SubAccountResponse> {
    const rounds = Math.max(10, Math.min(15, parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10) || 12));
    const passwordHash = await bcrypt.hash(password, rounds);
    const row = await this.repo.createSubAccount(adminId, email, passwordHash, name);
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
      expenseCount: 0,
      totalSpent: 0,
    };
  }

  async getExpensesByCategory(callerRole: `${UserRole}`, callerId: string, month?: number, year?: number): Promise<CategoryBreakdownResponse[]> {
    const scopedUserIds = await this.getScopedUserIds(callerRole, callerId);
    const rows = await this.repo.getExpensesByCategory(scopedUserIds.length > 0 ? scopedUserIds : undefined, month, year);
    const grandTotal = rows.reduce((s, r) => s + r.total, 0);
    return rows.map((r) => ({
      categoryId: r.categoryId ?? 'uncategorized',
      categoryName: r.categoryName ?? 'Uncategorized',
      color: r.color ?? '#6B7280',
      total: r.total,
      percentage: grandTotal > 0 ? Math.round((r.total / grandTotal) * 100) : 0,
    }));
  }

  async getPeriodTotals(callerRole: `${UserRole}`, callerId: string, month?: number, year?: number): Promise<{ totalIncome: number; totalExpenseAmount: number }> {
    const scopedUserIds = await this.getScopedUserIds(callerRole, callerId);
    return this.repo.getPeriodTotals(scopedUserIds.length > 0 ? scopedUserIds : undefined, month, year);
  }

  async getCategoryCounts(callerRole: `${UserRole}`, callerId: string, month?: number, year?: number): Promise<CategoryCountResponse[]> {
    const scopedUserIds = await this.getScopedUserIds(callerRole, callerId);
    return this.repo.getCategoryCounts(scopedUserIds.length > 0 ? scopedUserIds : undefined, month, year);
  }

  async getSubAccountDetail(
    adminId: string,
    subAccountId: string,
    month?: number,
    year?: number,
  ): Promise<AdminSubAccountDetailResponse> {
    // Verify admin owns this sub-account
    const subAccounts = await this.repo.getSubAccounts(adminId);
    const isOwned = subAccounts.some((s) => s.id === subAccountId);
    if (!isOwned) {
      throw new ForbiddenError('Sub-account not found or not managed by you');
    }

    // Invalidate all cached dashboard data for this sub-account
    await this.cache.deletePattern(`dashboard:${subAccountId}:*`);

    const [dashboard, incomes, chatHistory] = await Promise.all([
      this.dashboardService.getDashboard(subAccountId, month, year),
      this.repo.getIncomes(subAccountId, month, year),
      this.repo.getChatHistory(subAccountId),
    ]);

    return {
      dashboard,
      incomes: incomes.map((i) => ({
        id: i.id,
        userId: subAccountId,
        amount: i.amount,
        description: i.description,
        source: i.source,
        date: i.date,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      })),
      chatHistory: chatHistory.map((c) => ({
        id: c.id,
        role: c.role,
        content: c.content,
        createdAt: c.createdAt,
      })),
    };
  }
}
