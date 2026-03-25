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
import { ExpenseService } from '../services/ExpenseService';
import {
  CreateExpenseSchema,
  UpdateExpenseSchema,
} from '../validators/expense.validator';

const expenseService = container.resolve(ExpenseService);

export const health = withErrorHandler(
  async (_e: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> =>
    ok({ service: 'expense-service', status: 'ok', timestamp: new Date().toISOString() }),
);

export const listExpenses = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const qs = event.queryStringParameters ?? {};
    const month = qs['month'] ? parseInt(qs['month'], 10) : undefined;
    const year = qs['year'] ? parseInt(qs['year'], 10) : undefined;
    const expenses = await expenseService.list(userId, month, year);
    return ok(expenses);
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
    const id = event.pathParameters?.['id'] ?? '';
    const body = UpdateExpenseSchema.parse(parseBody(event));
    const expense = await expenseService.update(userId, id, body);
    return ok(expense);
  },
);

export const deleteExpense = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const id = event.pathParameters?.['id'] ?? '';
    await expenseService.remove(userId, id);
    return noContent();
  },
);
