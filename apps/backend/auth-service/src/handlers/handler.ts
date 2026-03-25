import 'reflect-metadata';
import '../container';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { container } from 'tsyringe';
import {
  IAuthService,
  withErrorHandler,
  parseBody,
  ok,
  created,
  authenticate,
} from '@financer/backend-shared';
import { RegisterSchema, LoginSchema, RefreshSchema } from '../validators/auth.validator';

const authService = container.resolve<IAuthService>('IAuthService');

export const health = withErrorHandler(
  async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    return ok({ service: 'auth-service', status: 'ok', timestamp: new Date().toISOString() });
  },
);

export const register = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const body = RegisterSchema.parse(parseBody(event));
    const result = await authService.register(body.email, body.password, body.name);
    return created(result);
  },
);

export const login = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const body = LoginSchema.parse(parseBody(event));
    const tokens = await authService.login(body.email, body.password);
    return ok(tokens);
  },
);

export const refresh = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const body = RefreshSchema.parse(parseBody(event));
    const tokens = await authService.refreshTokens(body.refreshToken);
    return ok(tokens);
  },
);

export const me = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    const user = await authService.getProfile(userId);
    return ok(user);
  },
);
