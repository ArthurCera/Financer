"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.getTokenExpiresIn = getTokenExpiresIn;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const types_1 = require("../types");
function getSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret)
        throw new Error('JWT_SECRET environment variable is not set');
    return secret;
}
function signAccessToken(userId, role = 'user') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return jsonwebtoken_1.default.sign({ sub: userId, role, type: 'access' }, getSecret(), {
        expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m'),
    });
}
function signRefreshToken(userId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return jsonwebtoken_1.default.sign({ sub: userId, type: 'refresh' }, getSecret(), {
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d'),
    });
}
function verifyAccessToken(token) {
    try {
        const payload = jsonwebtoken_1.default.verify(token, getSecret());
        if (payload.type !== 'access')
            throw new types_1.UnauthorizedError('Invalid token type');
        return payload;
    }
    catch (error) {
        if (error instanceof types_1.UnauthorizedError)
            throw error;
        throw new types_1.UnauthorizedError('Invalid or expired token');
    }
}
function verifyRefreshToken(token) {
    try {
        const payload = jsonwebtoken_1.default.verify(token, getSecret());
        if (payload.type !== 'refresh')
            throw new types_1.UnauthorizedError('Invalid token type');
        return payload;
    }
    catch (error) {
        if (error instanceof types_1.UnauthorizedError)
            throw error;
        throw new types_1.UnauthorizedError('Invalid or expired refresh token');
    }
}
/** Extract the numeric expiry (seconds from now) from a signed token. */
function getTokenExpiresIn(token) {
    const decoded = jsonwebtoken_1.default.decode(token);
    if (!decoded?.exp)
        return 900; // default 15m
    return Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
}
//# sourceMappingURL=jwt.js.map