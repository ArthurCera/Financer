/**
 * E2E test helpers — thin HTTP wrapper for testing microservices.
 * Tests assume services are running locally via `pnpm dev:backend`.
 */

const BASE_URLS = {
  auth: 'http://localhost:3001',
  expense: 'http://localhost:3002',
  budget: 'http://localhost:3003',
  income: 'http://localhost:3004',
  dashboard: 'http://localhost:3005',
  llm: 'http://localhost:3006',
} as const;

type ServiceName = keyof typeof BASE_URLS;

interface ApiResponse<T = unknown> {
  status: number;
  body: {
    success: boolean;
    data?: T;
    error?: { code: string; message: string };
  };
}

export async function request<T = unknown>(
  service: ServiceName,
  method: string,
  path: string,
  options?: { body?: unknown; token?: string },
): Promise<ApiResponse<T>> {
  const url = `${BASE_URLS[service]}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options?.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : { success: true };
  return { status: res.status, body };
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

let cachedUserTokens: AuthTokens | null = null;
let cachedAdminTokens: AuthTokens | null = null;

/** Register a fresh unique user and return tokens. */
export async function registerUser(
  email?: string,
  password = 'testpass123',
  name = 'Test User',
): Promise<AuthTokens> {
  const e = email ?? `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`;
  const res = await request<{ user: unknown; tokens: AuthTokens }>('auth', 'POST', '/auth/register', {
    body: { email: e, password, name },
  });
  if (!res.body.success || !res.body.data) {
    throw new Error(`Register failed: ${JSON.stringify(res.body)}`);
  }
  return res.body.data.tokens;
}

/** Login and return tokens. */
export async function login(email: string, password: string): Promise<AuthTokens> {
  const res = await request<AuthTokens>('auth', 'POST', '/auth/login', {
    body: { email, password },
  });
  if (!res.body.success || !res.body.data) {
    throw new Error(`Login failed: ${JSON.stringify(res.body)}`);
  }
  return res.body.data;
}

/** Get or create a regular user's tokens (cached per test run). */
export async function getUserTokens(): Promise<AuthTokens> {
  if (cachedUserTokens) return cachedUserTokens;
  cachedUserTokens = await registerUser();
  return cachedUserTokens;
}

/** Get admin tokens via login (cached per test run). */
export async function getAdminTokens(): Promise<AuthTokens> {
  if (cachedAdminTokens) return cachedAdminTokens;
  cachedAdminTokens = await login('root@financer.local', 'root');
  return cachedAdminTokens;
}

/** Get the demo user's tokens via login. */
export async function getDemoTokens(): Promise<AuthTokens> {
  return login('demo@financer.local', 'demo');
}

export { BASE_URLS, type ServiceName, type AuthTokens, type UserProfile };
