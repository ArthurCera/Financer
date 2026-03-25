import 'reflect-metadata';
import { container } from 'tsyringe';
import { db, RedisService } from '@financer/backend-shared';
import { UserRepository } from './repositories/UserRepository';
import { AuthService } from './services/AuthService';

container.register('db', { useValue: db });
container.register('ICacheService', { useClass: RedisService });
container.register('IUserRepository', { useClass: UserRepository });
container.register('IAuthService', { useClass: AuthService });
