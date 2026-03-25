import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
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
export declare function withErrorHandler(handler: AsyncHandler): APIGatewayProxyHandler;
/**
 * Parse and return the request body as the given type.
 * Throws a ValidationError if the body is missing or not valid JSON.
 */
export declare function parseBody<T>(event: APIGatewayProxyEvent): T;
export {};
//# sourceMappingURL=lambda.d.ts.map