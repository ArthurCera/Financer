import { describe, it, expect } from 'vitest';
import { request, registerUser, login, getAdminTokens } from './helpers';

describe('Auth Service (port 3001)', () => {
  // -------------------------------------------------------------------------
  // Health
  // -------------------------------------------------------------------------
  it('GET /health returns ok', async () => {
    const res = await request('auth', 'GET', '/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ service: 'auth-service', status: 'ok' });
  });

  // -------------------------------------------------------------------------
  // Register
  // -------------------------------------------------------------------------
  it('POST /auth/register creates a new user and returns tokens', async () => {
    const email = `reg-${Date.now()}@test.local`;
    const res = await request('auth', 'POST', '/auth/register', {
      body: { email, password: 'secret12345', name: 'New User' },
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const data = res.body.data as any;
    expect(data).toHaveProperty('user');
    expect(data).toHaveProperty('tokens');
    expect(data.tokens).toHaveProperty('accessToken');
    expect(data.tokens).toHaveProperty('refreshToken');
  });

  it('POST /auth/register rejects duplicate email', async () => {
    const email = `dup-${Date.now()}@test.local`;
    await registerUser(email);
    const res = await request('auth', 'POST', '/auth/register', {
      body: { email, password: 'secret12345', name: 'Dup' },
    });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('POST /auth/register rejects missing fields', async () => {
    const res = await request('auth', 'POST', '/auth/register', {
      body: { email: 'x@x.com' }, // missing password and name
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Login
  // -------------------------------------------------------------------------
  it('POST /auth/login succeeds with valid credentials', async () => {
    const email = `login-${Date.now()}@test.local`;
    await registerUser(email, 'password123', 'Login Test');
    const res = await request('auth', 'POST', '/auth/login', {
      body: { email, password: 'password123' },
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
  });

  it('POST /auth/login fails with wrong password', async () => {
    const email = `wrongpw-${Date.now()}@test.local`;
    await registerUser(email, 'correctpass1', 'PW Test');
    const res = await request('auth', 'POST', '/auth/login', {
      body: { email, password: 'wrongpassword' },
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /auth/login fails with non-existent email', async () => {
    const res = await request('auth', 'POST', '/auth/login', {
      body: { email: 'nonexistent@test.local', password: 'anypassword1' },
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Refresh
  // -------------------------------------------------------------------------
  it('POST /auth/refresh returns new tokens', async () => {
    const tokens = await registerUser();
    const res = await request('auth', 'POST', '/auth/refresh', {
      body: { refreshToken: tokens.refreshToken },
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
  });

  it('POST /auth/refresh rejects invalid token', async () => {
    const res = await request('auth', 'POST', '/auth/refresh', {
      body: { refreshToken: 'invalid-token' },
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Expired / tampered tokens
  // -------------------------------------------------------------------------
  it('GET /auth/me rejects an expired access token', async () => {
    // Craft a structurally-valid but expired JWT (payload exp = 0)
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJyb2xlIjoidXNlciIsImlhdCI6MTAwMDAwMDAwMCwiZXhwIjoxMDAwMDAwMDAxfQ.invalid-sig';
    const res = await request('auth', 'GET', '/auth/me', { token: fakeToken });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /auth/refresh returns a new access token each time', async () => {
    const tokens = await registerUser();
    const first = await request('auth', 'POST', '/auth/refresh', {
      body: { refreshToken: tokens.refreshToken },
    });
    expect(first.status).toBe(200);
    const firstAccess = (first.body.data as any).accessToken;

    // Wait 1s so JWT `iat` differs
    await new Promise((r) => setTimeout(r, 1100));

    const second = await request('auth', 'POST', '/auth/refresh', {
      body: { refreshToken: tokens.refreshToken },
    });
    expect(second.status).toBe(200);
    const secondAccess = (second.body.data as any).accessToken;

    // Each refresh should return a different access token
    expect(firstAccess).not.toBe(secondAccess);
  });

  // -------------------------------------------------------------------------
  // Me (profile)
  // -------------------------------------------------------------------------
  it('GET /auth/me returns user profile', async () => {
    const tokens = await registerUser();
    const res = await request('auth', 'GET', '/auth/me', { token: tokens.accessToken });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('email');
    expect(res.body.data).toHaveProperty('name');
    expect(res.body.data).toHaveProperty('role');
  });

  it('GET /auth/me rejects without token', async () => {
    const res = await request('auth', 'GET', '/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Admin role
  // -------------------------------------------------------------------------
  it('Admin user login returns admin role in profile', async () => {
    const tokens = await getAdminTokens();
    const res = await request('auth', 'GET', '/auth/me', { token: tokens.accessToken });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ role: 'admin' });
  });
});
