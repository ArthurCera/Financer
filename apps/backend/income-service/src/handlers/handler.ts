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
import { IncomeService } from '../services/IncomeService';
import {
  CreateIncomeSchema,
  UpdateIncomeSchema,
  PeriodSchema,
} from '../validators/income.validator';

const IdParam = z.string().uuid('ID must be a valid UUID');
const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const incomeService = container.resolve(IncomeService);
const userRepo = container.resolve<IReadRepository<UserDto>>('IUserReadRepository');

export const health = withErrorHandler(
  async (_e: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> =>
    ok({ service: 'income-service', status: 'ok', timestamp: new Date().toISOString() }),
);

export const listIncome = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { sub: callerId, role } = authenticateFull(event);
    const userId = await resolveEffectiveUserId(event, callerId, role, userRepo);
    const qs = event.queryStringParameters ?? {};
    let month: number | undefined;
    let year: number | undefined;
    if (qs['month'] || qs['year']) {
      const period = PeriodSchema.parse({ month: qs['month'], year: qs['year'] });
      month = period.month;
      year = period.year;
    }
    const { limit, offset } = PaginationSchema.parse({ limit: qs['limit'], offset: qs['offset'] });
    const { items, total } = await incomeService.list(userId, month, year, limit, offset);
    return okPaginated(items, total, limit, offset);
  },
);

export const createIncome = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { sub: callerId, role } = authenticateFull(event);
    const userId = await resolveEffectiveUserId(event, callerId, role, userRepo);
    const body = CreateIncomeSchema.parse(parseBody(event));
    const income = await incomeService.create(userId, body);
    return created(income);
  },
);

export const updateIncome = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { sub: callerId, role } = authenticateFull(event);
    const userId = await resolveEffectiveUserId(event, callerId, role, userRepo);
    const id = IdParam.parse(event.pathParameters?.['id']);
    const body = UpdateIncomeSchema.parse(parseBody(event));
    const income = await incomeService.update(userId, id, body);
    return ok(income);
  },
);

export const deleteIncome = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { sub: callerId, role } = authenticateFull(event);
    const userId = await resolveEffectiveUserId(event, callerId, role, userRepo);
    const id = IdParam.parse(event.pathParameters?.['id']);
    await incomeService.remove(userId, id);
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
  { method: 'GET',    pattern: /^\/health$/,                                  handler: health as RouteHandler },
  { method: 'GET',    pattern: /^\/income$/,                                  handler: listIncome as RouteHandler },
  { method: 'POST',   pattern: /^\/income$/,                                  handler: createIncome as RouteHandler },
  { method: 'PUT',    pattern: /^\/income\/(?<id>[0-9a-f-]{36})$/,             handler: updateIncome as RouteHandler },
  { method: 'DELETE', pattern: /^\/income\/(?<id>[0-9a-f-]{36})$/,             handler: deleteIncome as RouteHandler },
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
