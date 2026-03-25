import 'reflect-metadata';
import '../container';
import { z } from 'zod';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { container } from 'tsyringe';
import {
  withErrorHandler,
  parseBody,
  ok,
  okPaginated,
  created,
  noContent,
  authenticateFull,
  resolveEffectiveUserId,
  type IReadRepository,
  type UserDto,
} from '@financer/backend-shared';
import { BudgetService } from '../services/BudgetService';
import {
  CreateBudgetSchema,
  UpdateBudgetSchema,
  PeriodSchema,
} from '../validators/budget.validator';

const IdParam = z.string().uuid('ID must be a valid UUID');
const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const budgetService = container.resolve(BudgetService);
const userRepo = container.resolve<IReadRepository<UserDto>>('IUserReadRepository');

export const health = withErrorHandler(
  async (_e: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> =>
    ok({ service: 'budget-service', status: 'ok', timestamp: new Date().toISOString() }),
);

export const listBudgets = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { sub: callerId, role } = authenticateFull(event);
    const userId = await resolveEffectiveUserId(event, callerId, role, userRepo);
    const qs = event.queryStringParameters ?? {};
    const now = new Date();
    const period = PeriodSchema.parse({
      month: qs['month'] ?? now.getMonth() + 1,
      year: qs['year'] ?? now.getFullYear(),
    });
    const { limit, offset } = PaginationSchema.parse({ limit: qs['limit'], offset: qs['offset'] });
    const { items, total } = await budgetService.list(userId, period.month, period.year, limit, offset);
    return okPaginated(items, total, limit, offset);
  },
);

export const createBudget = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { sub: callerId, role } = authenticateFull(event);
    const userId = await resolveEffectiveUserId(event, callerId, role, userRepo);
    const body = CreateBudgetSchema.parse(parseBody(event));
    const budget = await budgetService.create(userId, body);
    return created(budget);
  },
);

export const updateBudget = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { sub: callerId, role } = authenticateFull(event);
    const userId = await resolveEffectiveUserId(event, callerId, role, userRepo);
    const id = IdParam.parse(event.pathParameters?.['id']);
    const body = UpdateBudgetSchema.parse(parseBody(event));
    const budget = await budgetService.update(userId, id, body);
    return ok(budget);
  },
);

export const deleteBudget = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { sub: callerId, role } = authenticateFull(event);
    const userId = await resolveEffectiveUserId(event, callerId, role, userRepo);
    const id = IdParam.parse(event.pathParameters?.['id']);
    await budgetService.remove(userId, id);
    return noContent();
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
  { method: 'GET',    pattern: /^\/health$/,                                   handler: health as RouteHandler },
  { method: 'GET',    pattern: /^\/budgets$/,                                  handler: listBudgets as RouteHandler },
  { method: 'POST',   pattern: /^\/budgets$/,                                  handler: createBudget as RouteHandler },
  { method: 'PUT',    pattern: /^\/budgets\/(?<id>[0-9a-f-]{36})$/,             handler: updateBudget as RouteHandler },
  { method: 'DELETE', pattern: /^\/budgets\/(?<id>[0-9a-f-]{36})$/,             handler: deleteBudget as RouteHandler },
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
