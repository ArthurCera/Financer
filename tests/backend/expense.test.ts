import { describe, it, expect, beforeAll } from 'vitest';
import { request, getUserTokens, getAdminTokens, type AuthTokens } from './helpers';

describe('Expense Service (port 3002)', () => {
  let tokens: AuthTokens;
  let createdId: string;

  beforeAll(async () => {
    tokens = await getUserTokens();
  });

  // -------------------------------------------------------------------------
  // Health
  // -------------------------------------------------------------------------
  it('GET /health returns ok', async () => {
    const res = await request('expense', 'GET', '/health');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ service: 'expense-service', status: 'ok' });
  });

  // -------------------------------------------------------------------------
  // CRUD lifecycle
  // -------------------------------------------------------------------------
  it('POST /expenses creates an expense', async () => {
    const res = await request('expense', 'POST', '/expenses', {
      token: tokens.accessToken,
      body: { amount: 42.5, description: 'Test expense', date: '2026-03-15' },
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toMatchObject({ amount: 42.5, description: 'Test expense' });
    createdId = (res.body.data as any).id;
  });

  it('GET /expenses lists user expenses', async () => {
    const res = await request('expense', 'GET', '/expenses?month=3&year=2026', {
      token: tokens.accessToken,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect((res.body.data as any[]).some((e: any) => e.id === createdId)).toBe(true);
  });

  it('PUT /expenses/:id updates an expense', async () => {
    const res = await request('expense', 'PUT', `/expenses/${createdId}`, {
      token: tokens.accessToken,
      body: { amount: 99.99, description: 'Updated expense' },
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ amount: 99.99, description: 'Updated expense' });
  });

  it('DELETE /expenses/:id deletes an expense', async () => {
    const res = await request('expense', 'DELETE', `/expenses/${createdId}`, {
      token: tokens.accessToken,
    });
    expect(res.status).toBe(204);

    // Verify the expense is actually gone
    const listRes = await request('expense', 'GET', '/expenses?month=3&year=2026', {
      token: tokens.accessToken,
    });
    expect(listRes.status).toBe(200);
    const remaining = listRes.body.data as any[];
    expect(remaining.some((e: any) => e.id === createdId)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Auth enforcement
  // -------------------------------------------------------------------------
  it('POST /expenses rejects without auth', async () => {
    const res = await request('expense', 'POST', '/expenses', {
      body: { amount: 10, description: 'No auth', date: '2026-03-01' },
    });
    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Ownership validation — service returns 404 for resources owned by others
  // -------------------------------------------------------------------------
  it('PUT /expenses/:id rejects update by different user', async () => {
    // Create as current user
    const createRes = await request('expense', 'POST', '/expenses', {
      token: tokens.accessToken,
      body: { amount: 10, description: 'Ownership test', date: '2026-03-01' },
    });
    const id = (createRes.body.data as any).id;

    // Try to update as admin (different user) — should return 404 (not 403, to avoid leaking existence)
    const adminTokens = await getAdminTokens();
    const res = await request('expense', 'PUT', `/expenses/${id}`, {
      token: adminTokens.accessToken,
      body: { amount: 999 },
    });
    expect(res.status).toBe(404);
  });

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------
  it('POST /expenses rejects missing amount', async () => {
    const res = await request('expense', 'POST', '/expenses', {
      token: tokens.accessToken,
      body: { description: 'No amount', date: '2026-03-01' },
    });
    expect(res.status).toBe(400);
  });
});
