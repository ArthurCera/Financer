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
  authenticate,
  ICategoryRepository,
  ForbiddenError,
  NotFoundError,
} from '@financer/backend-shared';
import { ExpenseService } from '../services/ExpenseService';
import {
  CreateExpenseSchema,
  UpdateExpenseSchema,
  PeriodSchema,
  CreateCategorySchema,
  UpdateCategorySchema,
} from '../validators/expense.validator';

const IdParam = z.string().uuid('ID must be a valid UUID');
const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const expenseService = container.resolve(ExpenseService);
const categoryRepo = container.resolve<ICategoryRepository>('ICategoryRepository');

export const health = withErrorHandler(
  async (_e: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> =>
    ok({ service: 'expense-service', status: 'ok', timestamp: new Date().toISOString() }),
);

export const listExpenses = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const qs = event.queryStringParameters ?? {};
    let month: number | undefined;
    let year: number | undefined;
    if (qs['month'] || qs['year']) {
      const period = PeriodSchema.parse({ month: qs['month'], year: qs['year'] });
      month = period.month;
      year = period.year;
    }
    const { limit, offset } = PaginationSchema.parse({ limit: qs['limit'], offset: qs['offset'] });
    const { items, total } = await expenseService.list(userId, month, year, limit, offset);
    return okPaginated(items, total, limit, offset);
  },
);

export const createExpense = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const body = CreateExpenseSchema.parse(parseBody(event));
    const expense = await expenseService.create(userId, body);
    return created(expense);
  },
);

export const updateExpense = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const id = IdParam.parse(event.pathParameters?.['id']);
    const body = UpdateExpenseSchema.parse(parseBody(event));
    const expense = await expenseService.update(userId, id, body);
    return ok(expense);
  },
);

export const deleteExpense = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const id = IdParam.parse(event.pathParameters?.['id']);
    await expenseService.remove(userId, id);
    return noContent();
  },
);

// ---------------------------------------------------------------------------
// Category CRUD
// ---------------------------------------------------------------------------

export const listCategories = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const categories = await categoryRepo.findForUser(userId);
    const data = categories.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      icon: c.icon,
      isDefault: c.isDefault,
      createdAt: c.createdAt.toISOString(),
    }));
    return ok(data);
  },
);

export const createCategory = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const body = CreateCategorySchema.parse(parseBody(event));
    const category = await categoryRepo.save({
      name: body.name,
      color: body.color,
      icon: body.icon,
      isDefault: false,
      userId,
    });
    return created({
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
      isDefault: category.isDefault,
      createdAt: category.createdAt.toISOString(),
    });
  },
);

export const updateCategory = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const id = IdParam.parse(event.pathParameters?.['id']);
    const body = UpdateCategorySchema.parse(parseBody(event));

    const existing = await categoryRepo.findById(id);
    if (!existing) throw new NotFoundError('Category', id);
    if (existing.isDefault) throw new ForbiddenError('Cannot modify a default category');
    if (existing.userId !== userId) throw new ForbiddenError('Cannot modify another user\'s category');

    const updated = await categoryRepo.update(id, {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.icon !== undefined && { icon: body.icon }),
    });
    return ok({
      id: updated.id,
      name: updated.name,
      color: updated.color,
      icon: updated.icon,
      isDefault: updated.isDefault,
      createdAt: updated.createdAt.toISOString(),
    });
  },
);

export const deleteCategory = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const id = IdParam.parse(event.pathParameters?.['id']);

    const existing = await categoryRepo.findById(id);
    if (!existing) throw new NotFoundError('Category', id);
    if (existing.isDefault) throw new ForbiddenError('Cannot delete a default category');
    if (existing.userId !== userId) throw new ForbiddenError('Cannot delete another user\'s category');

    await categoryRepo.delete(id);
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
  { method: 'GET',    pattern: /^\/health$/,                                    handler: health as RouteHandler },
  { method: 'GET',    pattern: /^\/expenses$/,                                  handler: listExpenses as RouteHandler },
  { method: 'POST',   pattern: /^\/expenses$/,                                  handler: createExpense as RouteHandler },
  { method: 'PUT',    pattern: /^\/expenses\/(?<id>[0-9a-f-]{36})$/,             handler: updateExpense as RouteHandler },
  { method: 'DELETE', pattern: /^\/expenses\/(?<id>[0-9a-f-]{36})$/,             handler: deleteExpense as RouteHandler },
  { method: 'GET',    pattern: /^\/categories$/,                                handler: listCategories as RouteHandler },
  { method: 'POST',   pattern: /^\/categories$/,                                handler: createCategory as RouteHandler },
  { method: 'PUT',    pattern: /^\/categories\/(?<id>[0-9a-f-]{36})$/,           handler: updateCategory as RouteHandler },
  { method: 'DELETE', pattern: /^\/categories\/(?<id>[0-9a-f-]{36})$/,           handler: deleteCategory as RouteHandler },
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
