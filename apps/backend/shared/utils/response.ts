import { APIGatewayProxyResult } from 'aws-lambda';

const JSON_HEADER = { 'Content-Type': 'application/json' };

function json(statusCode: number, body: unknown): APIGatewayProxyResult {
  return { statusCode, headers: JSON_HEADER, body: JSON.stringify(body) };
}

export function ok<T>(data: T): APIGatewayProxyResult {
  return json(200, { success: true, data });
}

export function created<T>(data: T): APIGatewayProxyResult {
  return json(201, { success: true, data });
}

export function noContent(): APIGatewayProxyResult {
  return { statusCode: 204, headers: JSON_HEADER, body: '' };
}

export function badRequest(message: string, fields?: Record<string, string>): APIGatewayProxyResult {
  return json(400, { success: false, error: { code: 'VALIDATION_ERROR', message, fields } });
}

export function unauthorized(message = 'Unauthorized'): APIGatewayProxyResult {
  return json(401, { success: false, error: { code: 'UNAUTHORIZED', message } });
}

export function forbidden(message = 'Forbidden'): APIGatewayProxyResult {
  return json(403, { success: false, error: { code: 'FORBIDDEN', message } });
}

export function notFound(message: string): APIGatewayProxyResult {
  return json(404, { success: false, error: { code: 'NOT_FOUND', message } });
}

export function conflict(message: string): APIGatewayProxyResult {
  return json(409, { success: false, error: { code: 'CONFLICT', message } });
}

export function serverError(message = 'Internal server error'): APIGatewayProxyResult {
  return json(500, { success: false, error: { code: 'INTERNAL_ERROR', message } });
}
