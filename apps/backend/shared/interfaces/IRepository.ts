/**
 * IRepository<T, ID>
 *
 * Generic base repository contract.
 * All domain repositories extend this interface to guarantee a consistent
 * data-access API across every microservice.
 *
 * Dependency Inversion: microservice services depend on this abstraction,
 * never on a concrete ORM or database driver.
 */
export interface IRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(filters?: Partial<T>): Promise<T[]>;
  save(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: ID, partial: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T>;
  delete(id: ID): Promise<void>;
}
