import { injectable, inject } from 'tsyringe';
import { BaseRepository, IUserRepository, UserDto, users, UserRow, eq } from '@financer/backend-shared';

@injectable()
export class UserRepository extends BaseRepository<UserDto> implements IUserRepository {
  constructor(@inject('db') db: any) {
    super(db);
  }

  async findById(id: string): Promise<UserDto | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id));
    if (rows.length === 0) return null;
    return this.rowToDto(rows[0] as UserRow);
  }

  async findAll(_filters?: Partial<UserDto>): Promise<UserDto[]> {
    const rows = await this.db.select().from(users);
    return (rows as UserRow[]).map((row) => this.rowToDto(row));
  }

  async save(entity: Omit<UserDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserDto> {
    const rows = await this.db
      .insert(users)
      .values({
        email: entity.email,
        passwordHash: entity.passwordHash,
        name: entity.name,
        role: entity.role ?? 'user',
      })
      .returning();
    return this.rowToDto(rows[0] as UserRow);
  }

  async update(id: string, partial: Partial<Omit<UserDto, 'id' | 'createdAt'>>): Promise<UserDto> {
    const rows = await this.db
      .update(users)
      .set({
        ...(partial.email !== undefined && { email: partial.email }),
        ...(partial.passwordHash !== undefined && { passwordHash: partial.passwordHash }),
        ...(partial.name !== undefined && { name: partial.name }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return this.rowToDto(rows[0] as UserRow);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }

  async findByEmail(email: string): Promise<UserDto | null> {
    const rows = await this.db.select().from(users).where(eq(users.email, email));
    if (rows.length === 0) return null;
    return this.rowToDto(rows[0] as UserRow);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const result = await this.findByEmail(email);
    return result !== null;
  }

  private rowToDto(row: UserRow): UserDto {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      name: row.name,
      role: (row.role as 'user' | 'admin') ?? 'user',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
