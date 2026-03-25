import 'reflect-metadata';
import '../container';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { container } from 'tsyringe';
import {
  withErrorHandler,
  parseBody,
  ok,
  created,
  noContent,
  authenticate,
} from '@financer/backend-shared';
import { BudgetService } from '../services/BudgetService';
import {
  CreateBudgetSchema,
  UpdateBudgetSchema,
} from '../validators/budget.validator';

const budgetService = container.resolve(BudgetService);

export const health = withErrorHandler(
  async (_e: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> =>
    ok({ service: 'budget-service', status: 'ok', timestamp: new Date().toISOString() }),
);

export const listBudgets = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const qs = event.queryStringParameters ?? {};
    const now = new Date();
    const month = qs['month'] ? parseInt(qs['month'], 10) : now.getMonth() + 1;
    const year = qs['year'] ? parseInt(qs['year'], 10) : now.getFullYear();
    const budgets = await budgetService.list(userId, month, year);
    return ok(budgets);
  },
);

export const createBudget = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const body = CreateBudgetSchema.parse(parseBody(event));
    const budget = await budgetService.create(userId, body);
    return created(budget);
  },
);

export const updateBudget = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const id = event.pathParameters?.['id'] ?? '';
    const body = UpdateBudgetSchema.parse(parseBody(event));
    const budget = await budgetService.update(userId, id, body);
    return ok(budget);
  },
);

export const deleteBudget = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const id = event.pathParameters?.['id'] ?? '';
    await budgetService.remove(userId, id);
    return noContent();
  },
);
