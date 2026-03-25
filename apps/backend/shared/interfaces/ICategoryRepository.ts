import { CategoryDto } from '../types';
import { IRepository } from './IRepository';

/**
 * ICategoryRepository
 *
 * Extends base repository with category-specific lookups.
 * Used by expense-service and budget-service to validate/resolve category IDs.
 */
export interface ICategoryRepository extends IRepository<CategoryDto> {
  findByName(name: string): Promise<CategoryDto | null>;
  findDefaults(): Promise<CategoryDto[]>;
  findByIds(ids: string[]): Promise<CategoryDto[]>;
  findForUser(userId: string): Promise<CategoryDto[]>;
}
