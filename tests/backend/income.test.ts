import { describe, it, expect, beforeAll } from 'vitest';
import { request, getUserTokens, getAdminTokens, type AuthTokens } from './helpers';

describe('Income Service (port 3004)', () => {
  let tokens: AuthTokens;
  let createdId: string;

  beforeAll(async () => {
    tokens = await getUserTokens();
  });

  // -------------------------------------------------------------------------
  // Health
  // -------------------------------------------------------------------------
  it('GET /health returns ok', async () => {
    const res = await request('income', 'GET', '/health');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ service: 'income-service', status: 'ok' });
  });

  // -------------------------------------------------------------------------
  // CRUD lifecycle
  // -------------------------------------------------------------------------
  it('POST /income creates an income record', async () => {
    const res = await request('income', 'POST', '/income', {
      token: tokens.accessToken,
      body: { amount: 3000, description: 'Salary', source: 'Employer', date: '2026-03-01' },
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toMatchObject({ amount: 3000, source: 'Employer' });
    createdId = (res.body.data as any).id;
  });

  it('GET /income lists income records', async () => {
    const res = await request('income', 'GET', '/income?month=3&year=2026', {
      token: tokens.accessToken,
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect((res.body.data as any[]).some((i: any) => i.id === createdId)).toBe(true);
  });

  it('PUT /income/:id updates an income record', async () => {
    const res = await request('income', 'PUT', `/income/${createdId}`, {
      token: tokens.accessToken,
      body: { amount: 3500, description: 'Salary raise' },
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ amount: 3500, description: 'Salary raise' });
  });

  it('DELETE /income/:id deletes an income record', async () => {
    const res = await request('income', 'DELETE', `/income/${createdId}`, {
      token: tokens.accessToken,
    });
    expect(res.status).toBe(204);

    // Verify the income record is actually gone
    const listRes = await request('income', 'GET', '/income?month=3&year=2026', {
      token: tokens.accessToken,
    });
    expect(listRes.status).toBe(200);
    const remaining = listRes.body.data as any[];
    expect(remaining.some((i: any) => i.id === createdId)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Auth enforcement
  // -------------------------------------------------------------------------
  it('POST /income rejects without auth', async () => {
    const res = await request('income', 'POST', '/income', {
      body: { amount: 100, date: '2026-03-01' },
    });
    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Ownership validation — returns 404 to avoid leaking resource existence
  // -------------------------------------------------------------------------
  it('PUT /income/:id rejects update by different user', async () => {
    const createRes = await request('income', 'POST', '/income', {
      token: tokens.accessToken,
      body: { amount: 500, description: 'Side gig', date: '2026-03-15' },
    });
    const id = (createRes.body.data as any).id;

    const adminTokens = await getAdminTokens();
    const res = await request('income', 'PUT', `/income/${id}`, {
      token: adminTokens.accessToken,
      body: { amount: 999 },
    });
    expect(res.status).toBe(404);
  });

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------
  it('POST /income rejects missing amount', async () => {
    const res = await request('income', 'POST', '/income', {
      token: tokens.accessToken,
      body: { description: 'No amount', date: '2026-03-01' },
    });
    expect(res.status).toBe(400);
  });
});
