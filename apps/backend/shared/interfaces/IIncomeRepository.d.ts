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
}
//# sourceMappingURL=IIncomeRepository.d.ts.map