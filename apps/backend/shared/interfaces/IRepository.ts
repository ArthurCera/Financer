import { IReadRepository } from './IReadRepository';

/**
 * IRepository<T, ID>
 *
 * Generic base repository contract.
 * All domain repositories extend this interface to guarantee a consistent
 * data-access API across every microservice.
 *
 * Extends IReadRepository with write operations. Services that only need
 * read access should depend on IReadRepository instead (Interface Segregation).
 *
 * Dependency Inversion: microservice services depend on this abstraction,
 * never on a concrete ORM or database driver.
 */
export interface IRepository<T, ID = string> extends IReadRepository<T, ID> {
  findAll(filters?: Record<string, unknown>): Promise<T[]>;
  save(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: ID, partial: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T>;
  delete(id: ID): Promise<void>;
}
