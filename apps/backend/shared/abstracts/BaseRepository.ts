import { IRepository } from '../interfaces/IRepository';
import type { DrizzleDB } from '../db/postgres.client';

/**
 * BaseRepository<T, ID>
 *
 * Abstract base class providing shared data-access logic.
 * Each microservice's concrete repository extends this class for
 * its domain entity (User, Expense, Budget, etc.).
 *
 * Concrete repositories implement save() and update() because
 * those operations require knowledge of the specific table schema.
 *
 * The Drizzle `db` instance is injected via constructor
 * (Dependency Inversion — no static imports of a concrete DB client here).
 */
export abstract class BaseRepository<T, ID = string> implements IRepository<T, ID> {
  constructor(protected readonly db: DrizzleDB) {}

  // ---------------------------------------------------------------------------
  // Abstract — service-specific table knowledge lives in subclasses
  // ---------------------------------------------------------------------------

  abstract findById(id: ID): Promise<T | null>;
  abstract findAll(filters?: Partial<T>): Promise<T[]>;
  abstract save(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  abstract update(id: ID, partial: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T>;
  abstract delete(id: ID): Promise<void>;

}
