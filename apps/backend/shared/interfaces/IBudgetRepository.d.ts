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
}
//# sourceMappingURL=IBudgetRepository.d.ts.map