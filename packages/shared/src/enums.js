"use strict";
/**
 * Shared enumerations used by both frontend and backend.
 * Keep this file free of any runtime logic — pure type definitions only.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatRole = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["SuperAdmin"] = "superadmin";
    UserRole["Admin"] = "admin";
    UserRole["User"] = "user";
})(UserRole || (exports.UserRole = UserRole = {}));
var ChatRole;
(function (ChatRole) {
    ChatRole["User"] = "user";
    ChatRole["Assistant"] = "assistant";
})(ChatRole || (exports.ChatRole = ChatRole = {}));
//# sourceMappingURL=enums.js.map