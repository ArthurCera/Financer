import { injectable, inject } from 'tsyringe';
import bcrypt from 'bcryptjs';
import {
  IAuthService,
  IUserRepository,
  ICacheService,
  UserDto,
  AppError,
  NotFoundError,
  UnauthorizedError,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getTokenExpiresIn,
  type UserRole,
} from '@financer/backend-shared';
import { AuthTokens, UserProfile } from '@financer/shared';

@injectable()
export class AuthService implements IAuthService {
  constructor(
    @inject('IUserRepository') private readonly userRepo: IUserRepository,
    @inject('ICacheService') private readonly cache: ICacheService,
  ) {}

  async register(
    email: string,
    password: string,
    name: string,
  ): Promise<{ user: UserProfile; tokens: AuthTokens }> {
    const exists = await this.userRepo.existsByEmail(email);
    if (exists) {
      throw new AppError('Email already registered', 409, 'CONFLICT');
    }

    const rounds = Math.max(10, Math.min(15, parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10) || 12));
    const passwordHash = await bcrypt.hash(password, rounds);
    const user = await this.userRepo.save({ email, passwordHash, name, role: 'admin', managedBy: null });
    const tokens = await this.issueTokens(user.id, user.role);

    return { user: this.toProfile(user), tokens };
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    return this.issueTokens(user.id, user.role);
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const payload = verifyRefreshToken(refreshToken);
    const stored = await this.cache.get<string>(`auth:refresh:${payload.sub}`);

    if (stored !== refreshToken) {
      throw new UnauthorizedError('Refresh token revoked');
    }

    // Look up user to get current role for new access token
    const user = await this.userRepo.findById(payload.sub);
    if (!user) throw new UnauthorizedError('User not found');

    // Revoke old refresh token before issuing new pair (rotate-on-use)
    await this.cache.delete(`auth:refresh:${payload.sub}`);

    return this.issueTokens(user.id, user.role);
  }

  async logout(userId: string): Promise<void> {
    await this.cache.delete(`auth:refresh:${userId}`);
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    return this.toProfile(user);
  }

  private async issueTokens(userId: string, role: UserRole = 'user'): Promise<AuthTokens> {
    const accessToken = signAccessToken(userId, role);
    const refreshToken = signRefreshToken(userId);
    const expiresIn = getTokenExpiresIn(accessToken);

    await this.cache.set(`auth:refresh:${userId}`, refreshToken, 7 * 24 * 60 * 60);

    return { accessToken, refreshToken, expiresIn };
  }

  private toProfile(user: UserDto): UserProfile {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      managedBy: user.managedBy,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
