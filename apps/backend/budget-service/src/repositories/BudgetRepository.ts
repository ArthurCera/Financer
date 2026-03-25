import { injectable, inject } from 'tsyringe';
import {
  BaseRepository,
  IBudgetRepository,
  BudgetDto,
  budgets,
  BudgetRow,
  eq,
  and,
  isNull,
  count,
  type DrizzleDB,
} from '@financer/backend-shared';

@injectable()
export class BudgetRepository extends BaseRepository<BudgetDto> implements IBudgetRepository {
  constructor(@inject('db') db: DrizzleDB) {
    super(db);
  }

  async findById(id: string): Promise<BudgetDto | null> {
    const rows = await this.db.select().from(budgets).where(eq(budgets.id, id));
    if (rows.length === 0) return null;
    return this.rowToDto(rows[0] as BudgetRow);
  }

  async findAll(filters?: Partial<BudgetDto>): Promise<BudgetDto[]> {
    if (filters?.userId) {
      const rows = await this.db
        .select()
        .from(budgets)
        .where(eq(budgets.userId, filters.userId));
      return (rows as BudgetRow[]).map((row) => this.rowToDto(row));
    }
    const rows = await this.db.select().from(budgets);
    return (rows as BudgetRow[]).map((row) => this.rowToDto(row));
  }

  async save(entity: Omit<BudgetDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<BudgetDto> {
    const rows = await this.db
      .insert(budgets)
      .values({
        userId: entity.userId,
        categoryId: entity.categoryId,
        amount: String(entity.amount),
        month: entity.month,
        year: entity.year,
      })
      .returning();
    return this.rowToDto(rows[0] as BudgetRow);
  }

  async update(
    id: string,
    partial: Partial<Omit<BudgetDto, 'id' | 'createdAt'>>,
  ): Promise<BudgetDto> {
    const setValues: Record<string, unknown> = { updatedAt: new Date() };
    if (partial.amount !== undefined) setValues['amount'] = String(partial.amount);
    if (partial.categoryId !== undefined) setValues['categoryId'] = partial.categoryId;
    if (partial.month !== undefined) setValues['month'] = partial.month;
    if (partial.year !== undefined) setValues['year'] = partial.year;

    const rows = await this.db
      .update(budgets)
      .set(setValues)
      .where(eq(budgets.id, id))
      .returning();
    return this.rowToDto(rows[0] as BudgetRow);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(budgets).where(eq(budgets.id, id));
  }

  async findByUserAndPeriod(userId: string, month: number, year: number): Promise<BudgetDto[]> {
    const rows = await this.db
      .select()
      .from(budgets)
      .where(
        and(eq(budgets.userId, userId), eq(budgets.month, month), eq(budgets.year, year)),
      );
    return (rows as BudgetRow[]).map((row) => this.rowToDto(row));
  }

  async findTotalBudget(userId: string, month: number, year: number): Promise<BudgetDto | null> {
    const rows = await this.db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.month, month),
          eq(budgets.year, year),
          isNull(budgets.categoryId),
        ),
      );
    if (rows.length === 0) return null;
    return this.rowToDto(rows[0] as BudgetRow);
  }

  async findByUserAndPeriodPaginated(
    userId: string,
    month: number,
    year: number,
    limit: number,
    offset: number,
  ): Promise<BudgetDto[]> {
    const rows = await this.db
      .select()
      .from(budgets)
      .where(
        and(eq(budgets.userId, userId), eq(budgets.month, month), eq(budgets.year, year)),
      )
      .limit(limit)
      .offset(offset);
    return (rows as BudgetRow[]).map((row) => this.rowToDto(row));
  }

  async countByUserAndPeriod(userId: string, month: number, year: number): Promise<number> {
    const [row] = await this.db
      .select({ count: count() })
      .from(budgets)
      .where(
        and(eq(budgets.userId, userId), eq(budgets.month, month), eq(budgets.year, year)),
      );
    return Number(row?.count ?? 0);
  }

  private rowToDto(row: BudgetRow): BudgetDto {
    return {
      id: row.id,
      userId: row.userId,
      categoryId: row.categoryId ?? null,
      amount: parseFloat(row.amount as string),
      month: row.month,
      year: row.year,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
