"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authenticateAdmin = authenticateAdmin;
const types_1 = require("../types");
const jwt_1 = require("../utils/jwt");
/**
 * Extract and verify the Bearer token from the Authorization header.
 * Returns the authenticated userId or throws UnauthorizedError.
 *
 * Usage in any protected handler:
 *   const userId = authenticate(event);
 */
function authenticate(event) {
    const authHeader = event.headers?.Authorization ?? event.headers?.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        throw new types_1.UnauthorizedError('Missing or malformed Authorization header');
    }
    const token = authHeader.slice(7);
    const payload = (0, jwt_1.verifyAccessToken)(token);
    return payload.sub;
}
/**
 * Authenticate and verify the user has admin role.
 * Returns the authenticated userId or throws ForbiddenError.
 */
function authenticateAdmin(event) {
    const authHeader = event.headers?.Authorization ?? event.headers?.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        throw new types_1.UnauthorizedError('Missing or malformed Authorization header');
    }
    const token = authHeader.slice(7);
    const payload = (0, jwt_1.verifyAccessToken)(token);
    if (payload.role !== 'admin') {
        throw new types_1.ForbiddenError('Admin access required');
    }
    return payload.sub;
}
//# sourceMappingURL=auth.middleware.js.map