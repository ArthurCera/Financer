import 'reflect-metadata';
import { container } from 'tsyringe';
import { db, RedisService, UserReadRepository } from '@financer/backend-shared';
import { IncomeRepository } from './repositories/IncomeRepository';
import { IncomeService } from './services/IncomeService';

container.register('db', { useValue: db });
container.register('ICacheService', { useClass: RedisService });
container.register('IIncomeRepository', { useClass: IncomeRepository });
container.register('IUserReadRepository', { useClass: UserReadRepository });
container.register(IncomeService, { useClass: IncomeService });
