import { injectable, inject } from 'tsyringe';
import { categories, CategoryRow, eq } from '@financer/backend-shared';

export interface CategoryInfo {
  id: string;
  name: string;
}

@injectable()
export class CategoryRepository {
  constructor(@inject('db') private readonly db: any) {}

  async findAll(): Promise<CategoryInfo[]> {
    const rows = await this.db.select({ id: categories.id, name: categories.name }).from(categories);
    return rows as CategoryInfo[];
  }

  async findById(id: string): Promise<CategoryInfo | null> {
    const rows = await this.db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.id, id));
    if (rows.length === 0) return null;
    return rows[0] as CategoryInfo;
  }

  async findByName(name: string): Promise<CategoryInfo | null> {
    const rows = await this.db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.name, name));
    if (rows.length === 0) return null;
    return rows[0] as CategoryInfo;
  }
}
