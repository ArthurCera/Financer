/**
 * IReadRepository<T, ID>
 *
 * Minimal read-only repository contract.
 * Use this when a consumer only needs to query data without write access.
 *
 * This satisfies Interface Segregation: services that only read (e.g. dashboard,
 * chat context builders) depend on this narrow contract instead of the full
 * IRepository which includes save/update/delete.
 */
export interface IReadRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(filters?: Record<string, unknown>): Promise<T[]>;
}
