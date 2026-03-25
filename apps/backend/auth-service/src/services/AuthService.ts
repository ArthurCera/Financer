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

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.userRepo.save({ email, passwordHash, name, role: 'user' });
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

    return this.issueTokens(user.id, user.role);
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    return this.toProfile(user);
  }

  private async issueTokens(userId: string, role: 'user' | 'admin' = 'user'): Promise<AuthTokens> {
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
      createdAt: user.createdAt.toISOString(),
    };
  }
}
