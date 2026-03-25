"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ok = ok;
exports.created = created;
exports.noContent = noContent;
exports.badRequest = badRequest;
exports.unauthorized = unauthorized;
exports.forbidden = forbidden;
exports.notFound = notFound;
exports.conflict = conflict;
exports.serverError = serverError;
const JSON_HEADER = { 'Content-Type': 'application/json' };
function json(statusCode, body) {
    return { statusCode, headers: JSON_HEADER, body: JSON.stringify(body) };
}
function ok(data) {
    return json(200, { success: true, data });
}
function created(data) {
    return json(201, { success: true, data });
}
function noContent() {
    return { statusCode: 204, headers: JSON_HEADER, body: '' };
}
function badRequest(message, fields) {
    return json(400, { success: false, error: { code: 'VALIDATION_ERROR', message, fields } });
}
function unauthorized(message = 'Unauthorized') {
    return json(401, { success: false, error: { code: 'UNAUTHORIZED', message } });
}
function forbidden(message = 'Forbidden') {
    return json(403, { success: false, error: { code: 'FORBIDDEN', message } });
}
function notFound(message) {
    return json(404, { success: false, error: { code: 'NOT_FOUND', message } });
}
function conflict(message) {
    return json(409, { success: false, error: { code: 'CONFLICT', message } });
}
function serverError(message = 'Internal server error') {
    return json(500, { success: false, error: { code: 'INTERNAL_ERROR', message } });
}
//# sourceMappingURL=response.js.map