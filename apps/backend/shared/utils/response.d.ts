import { APIGatewayProxyResult } from 'aws-lambda';
export declare function ok<T>(data: T): APIGatewayProxyResult;
export declare function created<T>(data: T): APIGatewayProxyResult;
export declare function noContent(): APIGatewayProxyResult;
export declare function badRequest(message: string, fields?: Record<string, string>): APIGatewayProxyResult;
export declare function unauthorized(message?: string): APIGatewayProxyResult;
export declare function forbidden(message?: string): APIGatewayProxyResult;
export declare function notFound(message: string): APIGatewayProxyResult;
export declare function conflict(message: string): APIGatewayProxyResult;
export declare function serverError(message?: string): APIGatewayProxyResult;
//# sourceMappingURL=response.d.ts.map