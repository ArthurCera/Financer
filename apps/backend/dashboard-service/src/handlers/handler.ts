import 'reflect-metadata';
import '../container';
import { z } from 'zod';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { container } from 'tsyringe';
import {
  withErrorHandler,
  ok,
  authenticate,
  authenticateFull,
  authenticateWithRole,
  parseBody,
} from '@financer/backend-shared';
import { DashboardService } from '../services/DashboardService';
import { AdminService } from '../services/AdminService';

const PeriodSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

const dashboardService = container.resolve(DashboardService);
const adminService = container.resolve(AdminService);

export const health = withErrorHandler(
  async (_e: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> =>
    ok({ service: 'dashboard-service', status: 'ok', timestamp: new Date().toISOString() }),
);

export const getDashboard = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const qs = event.queryStringParameters ?? {};
    // If 'all' param is truthy, skip month/year filtering
    if (qs['all'] === 'true') {
      const data = await dashboardService.getDashboard(userId);
      return ok(data);
    }
    const now = new Date();
    const period = PeriodSchema.parse({
      month: qs['month'] ?? now.getMonth() + 1,
      year: qs['year'] ?? now.getFullYear(),
    });
    const data = await dashboardService.getDashboard(userId, period.month, period.year);
    return ok(data);
  },
);

// ---------------------------------------------------------------------------
// Admin endpoints
// ---------------------------------------------------------------------------

export const getAdminUsers = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { sub: callerId, role } = authenticateFull(event);
    authenticateWithRole(event, 'admin', 'superadmin');
    const data = await adminService.getUsers(role, callerId);
    return ok(data);
  },
);

export const getAdminStats = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { sub: callerId, role } = authenticateFull(event);
    authenticateWithRole(event, 'admin', 'superadmin');
    const data = await adminService.getStats(role, callerId);
    return ok(data);
  },
);

export const getAdminLLMUsage = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    authenticateWithRole(event, 'admin', 'superadmin');
    const data = await adminService.getLLMUsage();
    return ok(data);
  },
);

export const getAdminLLMStats = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    authenticateWithRole(event, 'admin', 'superadmin');
    const data = await adminService.getDetailedLLMStats();
    return ok(data);
  },
);

export const updateUserRole = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { sub: callerId, role: callerRole } = authenticateFull(event);
    authenticateWithRole(event, 'admin', 'superadmin');
    const path = (event as unknown as { rawPath?: string }).rawPath ?? event.path ?? '';
    const idFromPath = path.split('/').pop() ?? '';
    const id = z.string().uuid().parse(event.pathParameters?.['id'] ?? idFromPath);
    const { role } = z.object({ role: z.enum(['user', 'admin', 'superadmin']) }).parse(parseBody(event));
    await adminService.updateUserRole(callerId, callerRole, id, role);
    return ok({ success: true });
  },
);

// ---------------------------------------------------------------------------
// Admin chart endpoints
// ---------------------------------------------------------------------------

export const getAdminExpensesByCategory = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { sub: callerId, role } = authenticateFull(event);
    authenticateWithRole(event, 'admin', 'superadmin');
    const qs = event.queryStringParameters ?? {};
    let month: number | undefined;
    let year: number | undefined;
    if (qs['all'] !== 'true' && (qs['month'] || qs['year'])) {
      const now = new Date();
      const period = PeriodSchema.parse({ month: qs['month'] ?? now.getMonth() + 1, year: qs['year'] ?? now.getFullYear() });
      month = period.month;
      year = period.year;
    }
    const data = await adminService.getExpensesByCategory(role, callerId, month, year);
    return ok(data);
  },
);

export const getAdminCategoryCounts = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { sub: callerId, role } = authenticateFull(event);
    authenticateWithRole(event, 'admin', 'superadmin');
    const qs = event.queryStringParameters ?? {};
    let month: number | undefined;
    let year: number | undefined;
    if (qs['all'] !== 'true' && (qs['month'] || qs['year'])) {
      const now = new Date();
      const period = PeriodSchema.parse({ month: qs['month'] ?? now.getMonth() + 1, year: qs['year'] ?? now.getFullYear() });
      month = period.month;
      year = period.year;
    }
    const data = await adminService.getCategoryCounts(role, callerId, month, year);
    return ok(data);
  },
);

export const getAdminPeriodTotals = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { sub: callerId, role } = authenticateFull(event);
    authenticateWithRole(event, 'admin', 'superadmin');
    const qs = event.queryStringParameters ?? {};
    let month: number | undefined;
    let year: number | undefined;
    if (qs['all'] !== 'true' && (qs['month'] || qs['year'])) {
      const now = new Date();
      const period = PeriodSchema.parse({ month: qs['month'] ?? now.getMonth() + 1, year: qs['year'] ?? now.getFullYear() });
      month = period.month;
      year = period.year;
    }
    const data = await adminService.getPeriodTotals(role, callerId, month, year);
    return ok(data);
  },
);

export const getSubAccountDetail = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const callerId = authenticateWithRole(event, 'admin');
    const path = (event as unknown as { rawPath?: string }).rawPath ?? event.path ?? '';
    const idMatch = /\/admin\/sub-accounts\/([0-9a-f-]{36})\/detail/.exec(path);
    const id = z.string().uuid().parse(event.pathParameters?.['id'] ?? idMatch?.[1] ?? '');
    const qs = event.queryStringParameters ?? {};
    let month: number | undefined;
    let year: number | undefined;
    if (qs['all'] !== 'true') {
      const now = new Date();
      const period = PeriodSchema.parse({
        month: qs['month'] ?? now.getMonth() + 1,
        year: qs['year'] ?? now.getFullYear(),
      });
      month = period.month;
      year = period.year;
    }
    const data = await adminService.getSubAccountDetail(callerId, id, month, year);
    return ok(data);
  },
);

// ---------------------------------------------------------------------------
// Sub-account endpoints
// ---------------------------------------------------------------------------

export const getSubAccounts = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const callerId = authenticateWithRole(event, 'admin');
    const data = await adminService.getSubAccounts(callerId);
    return ok(data);
  },
);

export const createSubAccount = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const callerId = authenticateWithRole(event, 'admin');
    const body = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().min(1).max(255),
    }).parse(parseBody(event));
    const data = await adminService.createSubAccount(callerId, body.email, body.password, body.name);
    return ok(data);
  },
);

// ---------------------------------------------------------------------------
// Router — single entry point for API Gateway proxy integration
// ---------------------------------------------------------------------------

type RouteHandler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

type Route = {
  method: string;
  pattern: RegExp;
  handler: RouteHandler;
};

const routes: Route[] = [
  { method: 'GET',  pattern: /^\/health$/,                      handler: health as RouteHandler },
  { method: 'GET',  pattern: /^\/dashboard$/,                   handler: getDashboard as RouteHandler },
  { method: 'GET',  pattern: /^\/admin\/users$/,                handler: getAdminUsers as RouteHandler },
  { method: 'GET',  pattern: /^\/admin\/stats$/,                handler: getAdminStats as RouteHandler },
  { method: 'GET',  pattern: /^\/admin\/llm-usage$/,            handler: getAdminLLMUsage as RouteHandler },
  { method: 'GET',  pattern: /^\/admin\/llm-stats$/,            handler: getAdminLLMStats as RouteHandler },
  { method: 'PUT',  pattern: /^\/admin\/users\/(?<id>[0-9a-f-]{36})$/, handler: updateUserRole as RouteHandler },
  { method: 'GET',  pattern: /^\/admin\/expenses-by-category$/,  handler: getAdminExpensesByCategory as RouteHandler },
  { method: 'GET',  pattern: /^\/admin\/period-totals$/,        handler: getAdminPeriodTotals as RouteHandler },
  { method: 'GET',  pattern: /^\/admin\/category-counts$/,      handler: getAdminCategoryCounts as RouteHandler },
  { method: 'GET',  pattern: /^\/admin\/sub-accounts\/(?<id>[0-9a-f-]{36})\/detail$/, handler: getSubAccountDetail as RouteHandler },
  { method: 'GET',  pattern: /^\/admin\/sub-accounts$/,         handler: getSubAccounts as RouteHandler },
  { method: 'POST', pattern: /^\/admin\/sub-accounts$/,         handler: createSubAccount as RouteHandler },
];

export const router = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const method = event.requestContext?.httpMethod ?? event.httpMethod ?? '';
  const path = (event as unknown as { rawPath?: string }).rawPath ?? event.path ?? '';

  for (const route of routes) {
    const match = route.pattern.exec(path);
    if (route.method === method.toUpperCase() && match) {
      if (match.groups) {
        event.pathParameters = { ...event.pathParameters, ...match.groups };
      }
      return route.handler(event);
    }
  }

  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Not Found', path, method }),
  };
};
