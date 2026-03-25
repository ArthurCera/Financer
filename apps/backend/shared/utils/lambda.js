"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withErrorHandler = withErrorHandler;
exports.parseBody = parseBody;
const zod_1 = require("zod");
const types_1 = require("../types");
const response_1 = require("./response");
/**
 * Wraps a Lambda handler with centralised error handling.
 *
 * Catches:
 *  - ValidationError  → 400 with field map
 *  - AppError         → mapped statusCode / code
 *  - ZodError         → 400 with per-field messages
 *  - unknown          → 500
 */
function withErrorHandler(handler) {
    return async (event) => {
        try {
            return await handler(event);
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const fields = error.errors.reduce((acc, e) => {
                    acc[e.path.join('.')] = e.message;
                    return acc;
                }, {});
                return (0, response_1.badRequest)('Validation failed', fields);
            }
            if (error instanceof types_1.ValidationError) {
                return (0, response_1.badRequest)(error.message, error.fields);
            }
            if (error instanceof types_1.AppError) {
                return {
                    statusCode: error.statusCode,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ success: false, error: { code: error.code, message: error.message } }),
                };
            }
            console.error('[Handler] Unhandled error:', error);
            return (0, response_1.serverError)();
        }
    };
}
/**
 * Parse and return the request body as the given type.
 * Throws a ValidationError if the body is missing or not valid JSON.
 */
function parseBody(event) {
    if (!event.body) {
        throw new types_1.ValidationError('Request body is required');
    }
    try {
        return JSON.parse(event.body);
    }
    catch {
        throw new types_1.ValidationError('Request body must be valid JSON');
    }
}
//# sourceMappingURL=lambda.js.map