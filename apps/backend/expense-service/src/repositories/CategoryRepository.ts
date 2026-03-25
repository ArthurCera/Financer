import { injectable, inject } from 'tsyringe';
import {
  BaseRepository,
  ICategoryRepository,
  CategoryDto,
  categories,
  CategoryRow,
  eq,
} from '@financer/backend-shared';

@injectable()
export class CategoryRepository extends BaseRepository<CategoryDto> implements ICategoryRepository {
  constructor(@inject('db') db: any) {
    super(db);
  }

  async findById(id: string): Promise<CategoryDto | null> {
    const rows = await this.db.select().from(categories).where(eq(categories.id, id));
    if (rows.length === 0) return null;
    return this.rowToDto(rows[0] as CategoryRow);
  }

  async findAll(_filters?: Partial<CategoryDto>): Promise<CategoryDto[]> {
    const rows = await this.db.select().from(categories);
    return (rows as CategoryRow[]).map((row) => this.rowToDto(row));
  }

  async save(entity: Omit<CategoryDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<CategoryDto> {
    const rows = await this.db
      .insert(categories)
      .values({
        name: entity.name,
        color: entity.color,
        icon: entity.icon,
        isDefault: entity.isDefault,
      })
      .returning();
    return this.rowToDto(rows[0] as CategoryRow);
  }

  async update(
    id: string,
    partial: Partial<Omit<CategoryDto, 'id' | 'createdAt'>>,
  ): Promise<CategoryDto> {
    const rows = await this.db
      .update(categories)
      .set({
        ...(partial.name !== undefined && { name: partial.name }),
        ...(partial.color !== undefined && { color: partial.color }),
        ...(partial.icon !== undefined && { icon: partial.icon }),
        ...(partial.isDefault !== undefined && { isDefault: partial.isDefault }),
      })
      .where(eq(categories.id, id))
      .returning();
    return this.rowToDto(rows[0] as CategoryRow);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(categories).where(eq(categories.id, id));
  }

  async findByName(name: string): Promise<CategoryDto | null> {
    const rows = await this.db.select().from(categories).where(eq(categories.name, name));
    if (rows.length === 0) return null;
    return this.rowToDto(rows[0] as CategoryRow);
  }

  async findDefaults(): Promise<CategoryDto[]> {
    const rows = await this.db
      .select()
      .from(categories)
      .where(eq(categories.isDefault, true));
    return (rows as CategoryRow[]).map((row) => this.rowToDto(row));
  }

  private rowToDto(row: CategoryRow): CategoryDto {
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      icon: row.icon,
      isDefault: row.isDefault,
      createdAt: row.createdAt,
    };
  }
}
