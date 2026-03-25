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
    sumByUserAndPeriod(userId: string, month: number, year: number): Promise<number>;
}
//# sourceMappingURL=IExpenseRepository.d.ts.map