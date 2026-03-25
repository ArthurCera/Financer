import 'reflect-metadata';
import '../container';
import { z } from 'zod';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { container } from 'tsyringe';
import {
  withErrorHandler,
  ok,
  authenticate,
  authenticateAdmin,
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
    authenticateAdmin(event);
    const data = await adminService.getUsers();
    return ok(data);
  },
);

export const getAdminStats = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    authenticateAdmin(event);
    const data = await adminService.getStats();
    return ok(data);
  },
);

export const getAdminLLMUsage = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    authenticateAdmin(event);
    const data = await adminService.getLLMUsage();
    return ok(data);
  },
);

export const getAdminLLMStats = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    authenticateAdmin(event);
    const data = await adminService.getDetailedLLMStats();
    return ok(data);
  },
);

export const updateUserRole = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    authenticateAdmin(event);
    const path = (event as unknown as { rawPath?: string }).rawPath ?? event.path ?? '';
    const idFromPath = path.split('/').pop() ?? '';
    const id = z.string().uuid().parse(event.pathParameters?.['id'] ?? idFromPath);
    const { role } = z.object({ role: z.enum(['user', 'admin']) }).parse(parseBody(event));
    await adminService.updateUserRole(id, role);
    return ok({ success: true });
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
