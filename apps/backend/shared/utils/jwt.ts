import jwt, { type SignOptions } from 'jsonwebtoken';
import { UnauthorizedError } from '../types';

export interface AccessTokenPayload {
  sub: string;
  role: 'user' | 'admin';
  type: 'access';
}

interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
}

function getAccessSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    // Fall back to JWT_SECRET only in development — production must set JWT_REFRESH_SECRET
    const fallback = process.env.JWT_SECRET;
    if (!fallback) throw new Error('JWT_REFRESH_SECRET environment variable is not set');
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_REFRESH_SECRET must be set separately from JWT_SECRET in production');
    }
    console.warn('[JWT] WARNING: JWT_REFRESH_SECRET not set — falling back to JWT_SECRET. Set a separate secret for production.');
    return fallback;
  }
  return secret;
}

export function signAccessToken(userId: string, role: 'user' | 'admin' = 'user'): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '15m') as SignOptions['expiresIn'];
  return jwt.sign({ sub: userId, role, type: 'access' }, getAccessSecret(), {
    expiresIn,
  });
}

export function signRefreshToken(userId: string): string {
  const expiresIn = (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as SignOptions['expiresIn'];
  return jwt.sign({ sub: userId, type: 'refresh' }, getRefreshSecret(), {
    expiresIn,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, getAccessSecret()) as AccessTokenPayload;
    if (payload.type !== 'access') throw new UnauthorizedError('Invalid token type');
    return payload;
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const payload = jwt.verify(token, getRefreshSecret()) as RefreshTokenPayload;
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
