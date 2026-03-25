import { injectable, inject } from 'tsyringe';
import { eq } from '../db/drizzle';
import { users, type UserRow } from '../db/schema/users.schema';
import type { UserDto, UserRole } from '../types';
import type { IReadRepository } from '../interfaces/IReadRepository';
import type { DrizzleDB } from '../db/postgres.client';

/**
 * Lightweight read-only user repository.
 * Only implements findById — used by resolveEffectiveUserId in data services
 * to verify admin-to-user ownership without pulling in the full auth UserRepository.
 */
@injectable()
export class UserReadRepository implements IReadRepository<UserDto> {
  constructor(@inject('db') private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<UserDto | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id));
    if (rows.length === 0) return null;
    return this.rowToDto(rows[0] as UserRow);
  }

  async findAll(): Promise<UserDto[]> {
    const rows = await this.db.select().from(users);
    return (rows as UserRow[]).map((row) => this.rowToDto(row));
  }

  private rowToDto(row: UserRow): UserDto {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      name: row.name,
      role: row.role as UserRole,
      managedBy: row.managedBy ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
