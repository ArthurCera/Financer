import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../types';
import { badRequest, serverError } from './response';

type AsyncHandler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

/**
 * Wraps a Lambda handler with centralised error handling.
 *
 * Catches:
 *  - ValidationError  → 400 with field map
 *  - AppError         → mapped statusCode / code
 *  - ZodError         → 400 with per-field messages
 *  - unknown          → 500
 */
export function withErrorHandler(handler: AsyncHandler): APIGatewayProxyHandler {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      return await handler(event);
    } catch (error) {
      if (error instanceof ZodError) {
        const fields = error.errors.reduce<Record<string, string>>((acc, e) => {
          acc[e.path.join('.')] = e.message;
          return acc;
        }, {});
        return badRequest('Validation failed', fields);
      }

      if (error instanceof ValidationError) {
        return badRequest(error.message, error.fields);
      }

      if (error instanceof AppError) {
        return {
          statusCode: error.statusCode,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: { code: error.code, message: error.message } }),
        };
      }

      console.error('[Handler] Unhandled error:', error);
      return serverError();
    }
  };
}

/**
 * Parse and return the request body as the given type.
 * Throws a ValidationError if the body is missing or not valid JSON.
 */
export function parseBody<T>(event: APIGatewayProxyEvent): T {
  if (!event.body) {
    throw new ValidationError('Request body is required');
  }
  try {
    return JSON.parse(event.body) as T;
  } catch {
    throw new ValidationError('Request body must be valid JSON');
  }
}
