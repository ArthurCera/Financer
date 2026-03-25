interface AccessTokenPayload {
    sub: string;
    role: 'user' | 'admin';
    type: 'access';
}
interface RefreshTokenPayload {
    sub: string;
    type: 'refresh';
}
export declare function signAccessToken(userId: string, role?: 'user' | 'admin'): string;
export declare function signRefreshToken(userId: string): string;
export declare function verifyAccessToken(token: string): AccessTokenPayload;
export declare function verifyRefreshToken(token: string): RefreshTokenPayload;
/** Extract the numeric expiry (seconds from now) from a signed token. */
export declare function getTokenExpiresIn(token: string): number;
export {};
//# sourceMappingURL=jwt.d.ts.map