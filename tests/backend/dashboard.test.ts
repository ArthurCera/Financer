import { describe, it, expect, beforeAll } from 'vitest';
import { request, getDemoTokens, getAdminTokens, getUserTokens, type AuthTokens } from './helpers';

describe('Dashboard Service (port 3005)', () => {
  let demoTokens: AuthTokens;
  let adminTokens: AuthTokens;
  let userTokens: AuthTokens;

  beforeAll(async () => {
    [demoTokens, adminTokens, userTokens] = await Promise.all([
      getDemoTokens(),
      getAdminTokens(),
      getUserTokens(),
    ]);
  });

  // -------------------------------------------------------------------------
  // Health
  // -------------------------------------------------------------------------
  it('GET /health returns ok', async () => {
    const res = await request('dashboard', 'GET', '/health');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ service: 'dashboard-service', status: 'ok' });
  });

  // -------------------------------------------------------------------------
  // Dashboard summary
  // -------------------------------------------------------------------------
  it('GET /dashboard returns summary for demo user with correct aggregation', async () => {
    const res = await request('dashboard', 'GET', '/dashboard', {
      token: demoTokens.accessToken,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data as any;
    expect(data).toHaveProperty('period');
    expect(data).toHaveProperty('totalExpenses');
    expect(data).toHaveProperty('totalIncome');
    expect(data).toHaveProperty('totalBudget');
    expect(data).toHaveProperty('expensesByCategory');
    expect(data).toHaveProperty('budgetVsActual');

    // Demo user has seeded data — verify aggregation returns meaningful numbers
    expect(typeof data.totalExpenses).toBe('number');
    expect(data.totalExpenses).toBeGreaterThan(0);
    expect(typeof data.totalIncome).toBe('number');
    expect(data.totalIncome).toBeGreaterThan(0);
    expect(typeof data.totalBudget).toBe('number');
    expect(data.totalBudget).toBeGreaterThan(0);

    // expensesByCategory should be an array with at least one entry
    expect(Array.isArray(data.expensesByCategory)).toBe(true);
    expect(data.expensesByCategory.length).toBeGreaterThan(0);
  });

  it('GET /dashboard accepts month/year params', async () => {
    const res = await request('dashboard', 'GET', '/dashboard?month=3&year=2026', {
      token: demoTokens.accessToken,
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ period: { month: 3, year: 2026 } });
  });

  it('GET /dashboard returns zeroes for a period with no data', async () => {
    const res = await request('dashboard', 'GET', '/dashboard?month=1&year=2020', {
      token: demoTokens.accessToken,
    });
    expect(res.status).toBe(200);
    const data = res.body.data as any;
    expect(data.totalExpenses).toBe(0);
    expect(data.totalIncome).toBe(0);
  });

  it('GET /dashboard rejects without auth', async () => {
    const res = await request('dashboard', 'GET', '/dashboard');
    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Admin: GET /admin/users
  // -------------------------------------------------------------------------
  it('GET /admin/users returns user list for admin', async () => {
    const res = await request('dashboard', 'GET', '/admin/users', {
      token: adminTokens.accessToken,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const users = res.body.data as any[];
    expect(users.length).toBeGreaterThanOrEqual(2);
    expect(users[0]).toHaveProperty('id');
    expect(users[0]).toHaveProperty('email');
    expect(users[0]).toHaveProperty('role');
  });

  it('GET /admin/users rejects non-admin user', async () => {
    const res = await request('dashboard', 'GET', '/admin/users', {
      token: userTokens.accessToken,
    });
    expect(res.status).toBe(403);
  });

  it('GET /admin/users rejects without auth', async () => {
    const res = await request('dashboard', 'GET', '/admin/users');
    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Admin: GET /admin/stats
  // -------------------------------------------------------------------------
  it('GET /admin/stats returns system stats for admin', async () => {
    const res = await request('dashboard', 'GET', '/admin/stats', {
      token: adminTokens.accessToken,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const stats = res.body.data as any;
    expect(stats).toHaveProperty('totalUsers');
    expect(stats).toHaveProperty('totalExpenses');
    expect(stats).toHaveProperty('totalIncome');
    // Verify values are numbers, not just present
    expect(typeof stats.totalUsers).toBe('number');
    expect(stats.totalUsers).toBeGreaterThanOrEqual(2); // at least admin + demo
  });

  it('GET /admin/stats rejects non-admin user', async () => {
    const res = await request('dashboard', 'GET', '/admin/stats', {
      token: userTokens.accessToken,
    });
    expect(res.status).toBe(403);
  });

  // -------------------------------------------------------------------------
  // Admin: GET /admin/llm-usage
  // -------------------------------------------------------------------------
  it('GET /admin/llm-usage returns LLM usage for admin', async () => {
    const res = await request('dashboard', 'GET', '/admin/llm-usage', {
      token: adminTokens.accessToken,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data as any;
    expect(data).toHaveProperty('users');
    expect(Array.isArray(data.users)).toBe(true);
    expect(data).toHaveProperty('totalMessages');
    expect(typeof data.totalMessages).toBe('number');
  });

  it('GET /admin/llm-usage rejects non-admin user', async () => {
    const res = await request('dashboard', 'GET', '/admin/llm-usage', {
      token: userTokens.accessToken,
    });
    expect(res.status).toBe(403);
  });

  // -------------------------------------------------------------------------
  // Dashboard: new fields (allTimeNetSavings, recentExpenses, llmStats)
  // -------------------------------------------------------------------------
  it('GET /dashboard includes allTimeNetSavings, recentExpenses, and llmStats', async () => {
    const res = await request('dashboard', 'GET', '/dashboard', {
      token: demoTokens.accessToken,
    });
    expect(res.status).toBe(200);
    const data = res.body.data as any;
    expect(data).toHaveProperty('allTimeNetSavings');
    expect(typeof data.allTimeNetSavings).toBe('number');
    expect(data).toHaveProperty('recentExpenses');
    expect(Array.isArray(data.recentExpenses)).toBe(true);
    expect(data).toHaveProperty('llmStats');
    expect(data.llmStats).toHaveProperty('chatMessageCount');
    expect(data.llmStats).toHaveProperty('categorizationsCount');
    expect(data.llmStats).toHaveProperty('lastChatAt');
  });

  // -------------------------------------------------------------------------
  // Admin: GET /admin/llm-stats (detailed stats)
  // -------------------------------------------------------------------------
  it('GET /admin/llm-stats returns detailed LLM analytics for admin', async () => {
    const res = await request('dashboard', 'GET', '/admin/llm-stats', {
      token: adminTokens.accessToken,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data as any;
    expect(data).toHaveProperty('totalChats');
    expect(data).toHaveProperty('totalMessages');
    expect(data).toHaveProperty('avgMessagesPerUser');
    expect(data).toHaveProperty('activeUsersLast7Days');
    expect(data).toHaveProperty('topUsers');
    expect(Array.isArray(data.topUsers)).toBe(true);
  });

  it('GET /admin/llm-stats rejects non-admin user', async () => {
    const res = await request('dashboard', 'GET', '/admin/llm-stats', {
      token: userTokens.accessToken,
    });
    expect(res.status).toBe(403);
  });

  // -------------------------------------------------------------------------
  // Admin: PUT /admin/users/:id (role management)
  // -------------------------------------------------------------------------
  it('PUT /admin/users/:id updates a user role', async () => {
    // Get user list to find a non-admin user
    const listRes = await request('dashboard', 'GET', '/admin/users', {
      token: adminTokens.accessToken,
    });
    const users = listRes.body.data as any[];
    const demoUser = users.find((u: any) => u.email === 'demo@financer.local');
    if (!demoUser) return;

    // Toggle to admin
    const res = await request('dashboard', 'PUT', `/admin/users/${demoUser.id}`, {
      token: adminTokens.accessToken,
      body: { role: 'admin' },
    });
    expect(res.status).toBe(200);

    // Toggle back to user
    const revert = await request('dashboard', 'PUT', `/admin/users/${demoUser.id}`, {
      token: adminTokens.accessToken,
      body: { role: 'user' },
    });
    expect(revert.status).toBe(200);
  });

  it('PUT /admin/users/:id rejects non-admin user', async () => {
    const res = await request('dashboard', 'PUT', '/admin/users/a0000000-0000-0000-0000-000000000001', {
      token: userTokens.accessToken,
      body: { role: 'admin' },
    });
    expect(res.status).toBe(403);
  });
});
