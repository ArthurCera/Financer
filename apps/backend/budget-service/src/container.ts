import 'reflect-metadata';
import { container } from 'tsyringe';
import { db, RedisService, CategoryRepository } from '@financer/backend-shared';
import { BudgetRepository } from './repositories/BudgetRepository';
import { BudgetService } from './services/BudgetService';

container.register('db', { useValue: db });
container.register('ICacheService', { useClass: RedisService });
container.register('ICategoryRepository', { useClass: CategoryRepository });
container.register('IBudgetRepository', { useClass: BudgetRepository });
container.register(BudgetService, { useClass: BudgetService });
