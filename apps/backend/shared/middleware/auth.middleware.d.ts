import { APIGatewayProxyEvent } from 'aws-lambda';
/**
 * Extract and verify the Bearer token from the Authorization header.
 * Returns the authenticated userId or throws UnauthorizedError.
 *
 * Usage in any protected handler:
 *   const userId = authenticate(event);
 */
export declare function authenticate(event: APIGatewayProxyEvent): string;
/**
 * Authenticate and verify the user has admin role.
 * Returns the authenticated userId or throws ForbiddenError.
 */
export declare function authenticateAdmin(event: APIGatewayProxyEvent): string;
//# sourceMappingURL=auth.middleware.d.ts.map