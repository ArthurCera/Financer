import 'reflect-metadata';
import { container } from 'tsyringe';
import { db, RedisService } from '@financer/backend-shared';
import { DashboardRepository } from './repositories/DashboardRepository';
import { DashboardService } from './services/DashboardService';
import { AdminRepository } from './repositories/AdminRepository';
import { AdminService } from './services/AdminService';

container.register('db', { useValue: db });
container.register('ICacheService', { useClass: RedisService });
container.register('DashboardRepository', { useClass: DashboardRepository });
container.register(DashboardService, { useClass: DashboardService });
container.register('AdminRepository', { useClass: AdminRepository });
container.register(AdminService, { useClass: AdminService });
