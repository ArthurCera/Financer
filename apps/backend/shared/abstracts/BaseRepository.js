"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
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
class BaseRepository {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(db) {
        this.db = db;
    }
    // ---------------------------------------------------------------------------
    // Shared helpers available to all subclasses
    // ---------------------------------------------------------------------------
    /**
     * Map a raw database row (snake_case) to a DTO (camelCase).
     * Override in subclasses to add entity-specific mappings.
     */
    mapRow(row) {
        return this.snakeToCamel(row);
    }
    snakeToCamel(obj) {
        return Object.entries(obj).reduce((acc, [key, value]) => {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            acc[camelKey] = value;
            return acc;
        }, {});
    }
}
exports.BaseRepository = BaseRepository;
//# sourceMappingURL=BaseRepository.js.map