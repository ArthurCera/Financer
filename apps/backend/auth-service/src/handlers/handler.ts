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
  noContent,
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

export const logout = withErrorHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId = authenticate(event);
    await authService.logout(userId);
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
  { method: 'GET',  pattern: /^\/health$/,        handler: health as RouteHandler },
  { method: 'POST', pattern: /^\/auth\/register$/, handler: register as RouteHandler },
  { method: 'POST', pattern: /^\/auth\/login$/,    handler: login as RouteHandler },
  { method: 'POST', pattern: /^\/auth\/refresh$/,  handler: refresh as RouteHandler },
  { method: 'GET',  pattern: /^\/auth\/me$/,       handler: me as RouteHandler },
  { method: 'POST', pattern: /^\/auth\/logout$/,   handler: logout as RouteHandler },
];

export const router = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const method = event.requestContext?.httpMethod ?? event.httpMethod ?? '';
  const path = (event as unknown as { rawPath?: string }).rawPath ?? event.path ?? '';

  for (const route of routes) {
    if (route.method === method.toUpperCase() && route.pattern.test(path)) {
      return route.handler(event);
    }
  }

  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Not Found', path, method }),
  };
};
