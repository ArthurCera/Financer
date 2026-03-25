import { APIGatewayProxyEvent } from 'aws-lambda';
import { UnauthorizedError, ForbiddenError } from '../types';
import type { UserRole } from '../types';
import { verifyAccessToken, type AccessTokenPayload } from '../utils/jwt';
import type { IReadRepository } from '../interfaces/IReadRepository';
import type { UserDto } from '../types';

/**
 * Extract and verify the Bearer token from the Authorization header.
 * Returns the authenticated userId or throws UnauthorizedError.
 */
export function authenticate(event: APIGatewayProxyEvent): string {
  return authenticateFull(event).sub;
}

/**
 * Authenticate and return the full JWT payload (sub + role).
 * Use this when the handler needs to check the caller's role.
 */
export function authenticateFull(event: APIGatewayProxyEvent): AccessTokenPayload {
  const authHeader = event.headers?.Authorization ?? event.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }
  const token = authHeader.slice(7);
  return verifyAccessToken(token);
}

/**
 * Authenticate and verify the user has admin role.
 * Returns the authenticated userId or throws ForbiddenError.
 */
export function authenticateAdmin(event: APIGatewayProxyEvent): string {
  const payload = authenticateFull(event);
  if (payload.role !== 'admin' && payload.role !== 'superadmin') {
    throw new ForbiddenError('Admin access required');
  }
  return payload.sub;
}

/**
 * Authenticate and verify the user has one of the allowed roles.
 * Returns the authenticated userId.
 */
export function authenticateWithRole(event: APIGatewayProxyEvent, ...allowedRoles: UserRole[]): string {
  const payload = authenticateFull(event);
  if (!allowedRoles.includes(payload.role)) {
    throw new ForbiddenError('Insufficient permissions');
  }
  return payload.sub;
}

/**
 * Resolve the effective userId for the request.
 *
 * If the `X-Acting-As` header is present, validates that the caller is an admin
 * who manages the target user. Returns the target userId.
 * If the header is absent, returns the caller's own userId.
 *
 * Superadmins cannot use X-Acting-As (they only see stats).
 * Regular users cannot use X-Acting-As.
 */
export async function resolveEffectiveUserId(
  event: APIGatewayProxyEvent,
  callerId: string,
  callerRole: UserRole,
  userRepo: IReadRepository<UserDto>,
): Promise<string> {
  const actingAs = event.headers?.['X-Acting-As'] ?? event.headers?.['x-acting-as'];
  if (!actingAs) return callerId;

  if (callerRole === 'user') {
    throw new ForbiddenError('Users cannot act on behalf of others');
  }
  if (callerRole === 'superadmin') {
    throw new ForbiddenError('Superadmins cannot access individual user data');
  }

  // callerRole === 'admin'
  const target = await userRepo.findById(actingAs);
  if (!target || target.managedBy !== callerId) {
    throw new ForbiddenError('Not authorized to access this account');
  }
  return target.id;
}
