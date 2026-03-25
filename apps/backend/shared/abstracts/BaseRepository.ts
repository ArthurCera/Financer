import { IRepository } from '../interfaces/IRepository';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(protected readonly db: any) {}

  // ---------------------------------------------------------------------------
  // Abstract — service-specific table knowledge lives in subclasses
  // ---------------------------------------------------------------------------

  abstract findById(id: ID): Promise<T | null>;
  abstract findAll(filters?: Partial<T>): Promise<T[]>;
  abstract save(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  abstract update(id: ID, partial: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T>;
  abstract delete(id: ID): Promise<void>;

  // ---------------------------------------------------------------------------
  // Shared helpers available to all subclasses
  // ---------------------------------------------------------------------------

  /**
   * Map a raw database row (snake_case) to a DTO (camelCase).
   * Override in subclasses to add entity-specific mappings.
   */
  protected mapRow(row: Record<string, unknown>): T {
    return this.snakeToCamel(row) as T;
  }

  private snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
    return Object.entries(obj).reduce(
      (acc, [key, value]) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
        acc[camelKey] = value;
        return acc;
      },
      {} as Record<string, unknown>,
    );
  }
}
