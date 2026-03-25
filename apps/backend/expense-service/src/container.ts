import 'reflect-metadata';
import { container } from 'tsyringe';
import { db, RedisService, CategoryRepository, UserReadRepository } from '@financer/backend-shared';
import { ExpenseRepository } from './repositories/ExpenseRepository';
import { ExpenseService } from './services/ExpenseService';

container.register('db', { useValue: db });
container.register('ICacheService', { useClass: RedisService });
container.register('ICategoryRepository', { useClass: CategoryRepository });
container.register('IExpenseRepository', { useClass: ExpenseRepository });
container.register('IUserReadRepository', { useClass: UserReadRepository });
container.register(ExpenseService, { useClass: ExpenseService });
