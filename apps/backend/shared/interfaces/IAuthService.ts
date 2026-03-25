import { AuthTokens, UserProfile } from '@financer/shared';

/**
 * IAuthService
 *
 * Contract for the authentication domain.
 * The auth-service handler depends on this interface, never on the concrete implementation.
 */
export interface IAuthService {
  register(email: string, password: string, name: string): Promise<{ user: UserProfile; tokens: AuthTokens }>;
  login(email: string, password: string): Promise<AuthTokens>;
  /** Validate the provided refresh token and issue a new token pair. */
  refreshTokens(refreshToken: string): Promise<AuthTokens>;
  getProfile(userId: string): Promise<UserProfile>;
}
