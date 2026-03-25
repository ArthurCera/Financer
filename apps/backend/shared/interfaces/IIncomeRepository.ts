import { IRepository } from './IRepository';
import { IncomeDto } from '../types';

/**
 * IIncomeRepository
 *
 * Extends base repository with income-specific queries.
 */
export interface IIncomeRepository extends IRepository<IncomeDto> {
  findByUserAndPeriod(userId: string, month: number, year: number): Promise<IncomeDto[]>;
  sumByUserAndPeriod(userId: string, month: number, year: number): Promise<number>;

  // Paginated queries
  findByUserPaginated(userId: string, limit: number, offset: number): Promise<IncomeDto[]>;
  findByUserAndPeriodPaginated(userId: string, month: number, year: number, limit: number, offset: number): Promise<IncomeDto[]>;
  countByUser(userId: string): Promise<number>;
  countByUserAndPeriod(userId: string, month: number, year: number): Promise<number>;
}
