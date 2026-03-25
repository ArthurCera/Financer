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
export declare abstract class BaseRepository<T, ID = string> implements IRepository<T, ID> {
    protected readonly db: any;
    constructor(db: any);
    abstract findById(id: ID): Promise<T | null>;
    abstract findAll(filters?: Partial<T>): Promise<T[]>;
    abstract save(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
    abstract update(id: ID, partial: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T>;
    abstract delete(id: ID): Promise<void>;
    /**
     * Map a raw database row (snake_case) to a DTO (camelCase).
     * Override in subclasses to add entity-specific mappings.
     */
    protected mapRow(row: Record<string, unknown>): T;
    private snakeToCamel;
}
//# sourceMappingURL=BaseRepository.d.ts.map