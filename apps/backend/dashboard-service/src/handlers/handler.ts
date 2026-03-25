import 'reflect-metadata';
import '../container';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { container } from 'tsyringe';
import {
  withErrorHandler,
  ok,
  authenticate,
  authenticateAdmin,
} from '@financer/backend-shared';
import { DashboardService } from '../services/DashboardService';
import { AdminService } from '../services/AdminService';

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
    const month = qs['month'] ? parseInt(qs['month'], 10) : now.getMonth() + 1;
    const year = qs['year'] ? parseInt(qs['year'], 10) : now.getFullYear();
    const data = await dashboardService.getDashboard(userId, month, year);
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
