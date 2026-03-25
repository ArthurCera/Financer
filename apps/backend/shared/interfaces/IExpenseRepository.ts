import { IRepository } from './IRepository';
import { ExpenseDto } from '../types';

/**
 * IExpenseRepository
 *
 * Extends base repository with expense-specific queries.
 * The expense-service depends on this abstraction.
 */
export interface IExpenseRepository extends IRepository<ExpenseDto> {
  findByUserAndPeriod(userId: string, month: number, year: number): Promise<ExpenseDto[]>;
  findUncategorizedByUser(userId: string): Promise<ExpenseDto[]>;
  findUncategorizedByUserAndPeriod(userId: string, month: number, year: number): Promise<ExpenseDto[]>;
  sumByUserAndPeriod(userId: string, month: number, year: number): Promise<number>;
  sumByCategoryAndPeriod(
    userId: string,
    month: number,
    year: number,
    limit?: number,
  ): Promise<Array<{ categoryName: string | null; total: number }>>;

  // Paginated queries
  findByUserPaginated(userId: string, limit: number, offset: number): Promise<ExpenseDto[]>;
  findByUserAndPeriodPaginated(userId: string, month: number, year: number, limit: number, offset: number): Promise<ExpenseDto[]>;
  countByUser(userId: string): Promise<number>;
  countByUserAndPeriod(userId: string, month: number, year: number): Promise<number>;
}
