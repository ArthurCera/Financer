import { injectable, inject } from 'tsyringe';
import {
  BaseRepository,
  IIncomeRepository,
  IncomeDto,
  incomes,
  IncomeRow,
  eq,
  and,
  gte,
  lt,
  sum,
  count,
  desc,
  getMonthPeriodDates,
  type DrizzleDB,
} from '@financer/backend-shared';

@injectable()
export class IncomeRepository extends BaseRepository<IncomeDto> implements IIncomeRepository {
  constructor(@inject('db') db: DrizzleDB) {
    super(db);
  }

  async findById(id: string): Promise<IncomeDto | null> {
    const rows = await this.db.select().from(incomes).where(eq(incomes.id, id));
    if (rows.length === 0) return null;
    return this.rowToDto(rows[0] as IncomeRow);
  }

  async findAll(filters?: Partial<IncomeDto>): Promise<IncomeDto[]> {
    if (filters?.userId) {
      const rows = await this.db
        .select()
        .from(incomes)
        .where(eq(incomes.userId, filters.userId));
      return (rows as IncomeRow[]).map((row) => this.rowToDto(row));
    }
    const rows = await this.db.select().from(incomes);
    return (rows as IncomeRow[]).map((row) => this.rowToDto(row));
  }

  async save(entity: Omit<IncomeDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<IncomeDto> {
    const rows = await this.db
      .insert(incomes)
      .values({
        userId: entity.userId,
        amount: String(entity.amount),
        description: entity.description,
        source: entity.source,
        date: entity.date instanceof Date
          ? entity.date.toISOString().split('T')[0]
          : entity.date,
      })
      .returning();
    return this.rowToDto(rows[0] as IncomeRow);
  }

  async update(
    id: string,
    partial: Partial<Omit<IncomeDto, 'id' | 'createdAt'>>,
  ): Promise<IncomeDto> {
    const setValues: Record<string, unknown> = { updatedAt: new Date() };
    if (partial.amount !== undefined) setValues['amount'] = String(partial.amount);
    if (partial.description !== undefined) setValues['description'] = partial.description;
    if (partial.source !== undefined) setValues['source'] = partial.source;
    if (partial.date !== undefined) {
      setValues['date'] = partial.date instanceof Date
        ? partial.date.toISOString().split('T')[0]
        : partial.date;
    }

    const rows = await this.db
      .update(incomes)
      .set(setValues)
      .where(eq(incomes.id, id))
      .returning();
    return this.rowToDto(rows[0] as IncomeRow);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(incomes).where(eq(incomes.id, id));
  }

  async findByUserAndPeriod(userId: string, month: number, year: number): Promise<IncomeDto[]> {
    const { start, end } = getMonthPeriodDates(month, year);

    const rows = await this.db
      .select()
      .from(incomes)
      .where(and(eq(incomes.userId, userId), gte(incomes.date, start), lt(incomes.date, end)));
    return (rows as IncomeRow[]).map((row) => this.rowToDto(row));
  }

  async sumByUserAndPeriod(userId: string, month: number, year: number): Promise<number> {
    const { start, end } = getMonthPeriodDates(month, year);

    const [row] = await this.db
      .select({ total: sum(incomes.amount) })
      .from(incomes)
      .where(and(eq(incomes.userId, userId), gte(incomes.date, start), lt(incomes.date, end)));
    return parseFloat(String(row?.total ?? 0));
  }

  async findByUserPaginated(userId: string, limit: number, offset: number): Promise<IncomeDto[]> {
    const rows = await this.db
      .select()
      .from(incomes)
      .where(eq(incomes.userId, userId))
      .orderBy(desc(incomes.date))
      .limit(limit)
      .offset(offset);
    return (rows as IncomeRow[]).map((row) => this.rowToDto(row));
  }

  async findByUserAndPeriodPaginated(
    userId: string,
    month: number,
    year: number,
    limit: number,
    offset: number,
  ): Promise<IncomeDto[]> {
    const { start, end } = getMonthPeriodDates(month, year);
    const rows = await this.db
      .select()
      .from(incomes)
      .where(and(eq(incomes.userId, userId), gte(incomes.date, start), lt(incomes.date, end)))
      .orderBy(desc(incomes.date))
      .limit(limit)
      .offset(offset);
    return (rows as IncomeRow[]).map((row) => this.rowToDto(row));
  }

  async countByUser(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ count: count() })
      .from(incomes)
      .where(eq(incomes.userId, userId));
    return Number(row?.count ?? 0);
  }

  async countByUserAndPeriod(userId: string, month: number, year: number): Promise<number> {
    const { start, end } = getMonthPeriodDates(month, year);
    const [row] = await this.db
      .select({ count: count() })
      .from(incomes)
      .where(and(eq(incomes.userId, userId), gte(incomes.date, start), lt(incomes.date, end)));
    return Number(row?.count ?? 0);
  }

  private rowToDto(row: IncomeRow): IncomeDto {
    return {
      id: row.id,
      userId: row.userId,
      amount: parseFloat(row.amount as string),
      description: row.description ?? null,
      source: row.source ?? null,
      date: new Date(row.date as string),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
