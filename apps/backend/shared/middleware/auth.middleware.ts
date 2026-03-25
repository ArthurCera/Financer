import { APIGatewayProxyEvent } from 'aws-lambda';
import { UnauthorizedError, ForbiddenError } from '../types';
import { verifyAccessToken } from '../utils/jwt';

/**
 * Extract and verify the Bearer token from the Authorization header.
 * Returns the authenticated userId or throws UnauthorizedError.
 *
 * Usage in any protected handler:
 *   const userId = authenticate(event);
 */
export function authenticate(event: APIGatewayProxyEvent): string {
  const authHeader = event.headers?.Authorization ?? event.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }
  const token = authHeader.slice(7);
  const payload = verifyAccessToken(token);
  return payload.sub;
}

/**
 * Authenticate and verify the user has admin role.
 * Returns the authenticated userId or throws ForbiddenError.
 */
export function authenticateAdmin(event: APIGatewayProxyEvent): string {
  const authHeader = event.headers?.Authorization ?? event.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }
  const token = authHeader.slice(7);
  const payload = verifyAccessToken(token);
  if (payload.role !== 'admin') {
    throw new ForbiddenError('Admin access required');
  }
  return payload.sub;
}
