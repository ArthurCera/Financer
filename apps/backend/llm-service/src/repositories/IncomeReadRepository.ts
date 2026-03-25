import { injectable, inject } from 'tsyringe';
import {
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
export class IncomeReadRepository implements IIncomeRepository {
  constructor(@inject('db') private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<IncomeDto | null> {
    const rows = await this.db.select().from(incomes).where(eq(incomes.id, id));
    if (rows.length === 0) return null;
    return this.rowToDto(rows[0] as IncomeRow);
  }

  async findAll(filters?: Partial<IncomeDto>): Promise<IncomeDto[]> {
    if (filters?.userId) {
      const rows = await this.db.select().from(incomes).where(eq(incomes.userId, filters.userId));
      return (rows as IncomeRow[]).map((row) => this.rowToDto(row));
    }
    const rows = await this.db.select().from(incomes);
    return (rows as IncomeRow[]).map((row) => this.rowToDto(row));
  }

  async save(_entity: Omit<IncomeDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<IncomeDto> {
    throw new Error('IncomeReadRepository does not support write operations');
  }

  async update(_id: string, _partial: Partial<Omit<IncomeDto, 'id' | 'createdAt'>>): Promise<IncomeDto> {
    throw new Error('IncomeReadRepository does not support write operations');
  }

  async delete(_id: string): Promise<void> {
    throw new Error('IncomeReadRepository does not support write operations');
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
    userId: string, month: number, year: number, limit: number, offset: number,
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
    const [row] = await this.db.select({ count: count() }).from(incomes).where(eq(incomes.userId, userId));
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
