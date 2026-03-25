import { IRepository } from './IRepository';
import { UserDto } from '../types';

/**
 * IUserRepository
 *
 * Extends the base repository with user-specific query operations.
 * The auth-service depends on this interface, never on a concrete implementation.
 */
export interface IUserRepository extends IRepository<UserDto> {
  findByEmail(email: string): Promise<UserDto | null>;
  existsByEmail(email: string): Promise<boolean>;
  findByManagedBy(adminId: string): Promise<UserDto[]>;
}
