import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../types';

interface AccessTokenPayload {
  sub: string;
  role: 'user' | 'admin';
  type: 'access';
}

interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return secret;
}

export function signAccessToken(userId: string, role: 'user' | 'admin' = 'user'): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign({ sub: userId, role, type: 'access' }, getSecret(), {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as any,
  });
}

export function signRefreshToken(userId: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign({ sub: userId, type: 'refresh' }, getSecret(), {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as any,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, getSecret()) as AccessTokenPayload;
    if (payload.type !== 'access') throw new UnauthorizedError('Invalid token type');
    return payload;
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const payload = jwt.verify(token, getSecret()) as RefreshTokenPayload;
    if (payload.type !== 'refresh') throw new UnauthorizedError('Invalid token type');
    return payload;
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}

/** Extract the numeric expiry (seconds from now) from a signed token. */
export function getTokenExpiresIn(token: string): number {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) return 900; // default 15m
  return Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
}
