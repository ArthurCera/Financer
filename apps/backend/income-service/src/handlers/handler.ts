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
import { IncomeService } from '../services/IncomeService';
import {
  CreateIncomeSchema,
  UpdateIncomeSchema,
} from '../validators/income.validator';

const incomeService = container.resolve(IncomeService);

export const health = withErrorHandler(
  async (_e: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> =>
    ok({ service: 'income-service', status: 'ok', timestamp: new Date().toISOString() }),
);

export const listIncome = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const qs = event.queryStringParameters ?? {};
    const month = qs['month'] ? parseInt(qs['month'], 10) : undefined;
    const year = qs['year'] ? parseInt(qs['year'], 10) : undefined;
    const incomes = await incomeService.list(userId, month, year);
    return ok(incomes);
  },
);

export const createIncome = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const body = CreateIncomeSchema.parse(parseBody(event));
    const income = await incomeService.create(userId, body);
    return created(income);
  },
);

export const updateIncome = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const id = event.pathParameters?.['id'] ?? '';
    const body = UpdateIncomeSchema.parse(parseBody(event));
    const income = await incomeService.update(userId, id, body);
    return ok(income);
  },
);

export const deleteIncome = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const id = event.pathParameters?.['id'] ?? '';
    await incomeService.remove(userId, id);
    return noContent();
  },
);
