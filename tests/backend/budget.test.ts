import { describe, it, expect, beforeAll } from 'vitest';
import { request, getUserTokens, getAdminTokens, type AuthTokens } from './helpers';

describe('Budget Service (port 3003)', () => {
  let tokens: AuthTokens;
  let createdId: string;

  beforeAll(async () => {
    tokens = await getUserTokens();
  });

  // -------------------------------------------------------------------------
  // Health
  // -------------------------------------------------------------------------
  it('GET /health returns ok', async () => {
    const res = await request('budget', 'GET', '/health');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ service: 'budget-service', status: 'ok' });
  });

  // -------------------------------------------------------------------------
  // CRUD lifecycle
  // -------------------------------------------------------------------------
  it('POST /budgets creates a budget', async () => {
    const res = await request('budget', 'POST', '/budgets', {
      token: tokens.accessToken,
      body: { amount: 500, month: 3, year: 2026 },
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toMatchObject({ amount: 500 });
    createdId = (res.body.data as any).id;
  });

  it('GET /budgets lists budgets for period', async () => {
    const res = await request('budget', 'GET', '/budgets?month=3&year=2026', {
      token: tokens.accessToken,
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect((res.body.data as any[]).some((b: any) => b.id === createdId)).toBe(true);
  });

  it('PUT /budgets/:id updates a budget', async () => {
    const res = await request('budget', 'PUT', `/budgets/${createdId}`, {
      token: tokens.accessToken,
      body: { amount: 750 },
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ amount: 750 });
  });

  it('DELETE /budgets/:id deletes a budget', async () => {
    const res = await request('budget', 'DELETE', `/budgets/${createdId}`, {
      token: tokens.accessToken,
    });
    expect(res.status).toBe(204);

    // Verify the budget is actually gone
    const listRes = await request('budget', 'GET', '/budgets?month=3&year=2026', {
      token: tokens.accessToken,
    });
    expect(listRes.status).toBe(200);
    const remaining = listRes.body.data as any[];
    expect(remaining.some((b: any) => b.id === createdId)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Auth enforcement
  // -------------------------------------------------------------------------
  it('POST /budgets rejects without auth', async () => {
    const res = await request('budget', 'POST', '/budgets', {
      body: { amount: 100, month: 1, year: 2026 },
    });
    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Ownership validation — returns 404 to avoid leaking resource existence
  // -------------------------------------------------------------------------
  it('PUT /budgets/:id rejects update by different user', async () => {
    const createRes = await request('budget', 'POST', '/budgets', {
      token: tokens.accessToken,
      body: { amount: 200, month: 4, year: 2026 },
    });
    const id = (createRes.body.data as any).id;

    const adminTokens = await getAdminTokens();
    const res = await request('budget', 'PUT', `/budgets/${id}`, {
      token: adminTokens.accessToken,
      body: { amount: 999 },
    });
    expect(res.status).toBe(404);
  });

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------
  it('POST /budgets rejects missing amount', async () => {
    const res = await request('budget', 'POST', '/budgets', {
      token: tokens.accessToken,
      body: { month: 1, year: 2026 },
    });
    expect(res.status).toBe(400);
  });
});
