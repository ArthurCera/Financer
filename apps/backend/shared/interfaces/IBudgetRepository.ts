import { IRepository } from './IRepository';
import { BudgetDto } from '../types';

/**
 * IBudgetRepository
 *
 * Extends base repository with budget-specific queries.
 */
export interface IBudgetRepository extends IRepository<BudgetDto> {
  findByUserAndPeriod(userId: string, month: number, year: number): Promise<BudgetDto[]>;
  findTotalBudget(userId: string, month: number, year: number): Promise<BudgetDto | null>;

  // Paginated queries
  findByUserAndPeriodPaginated(userId: string, month: number, year: number, limit: number, offset: number): Promise<BudgetDto[]>;
  countByUserAndPeriod(userId: string, month: number, year: number): Promise<number>;
}
