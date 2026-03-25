import { injectable, inject } from 'tsyringe';
import {
  BaseRepository,
  IExpenseRepository,
  ExpenseDto,
  expenses,
  ExpenseRow,
  eq,
  and,
  gte,
  lt,
  isNull,
  sum,
  getMonthPeriodDates,
} from '@financer/backend-shared';

@injectable()
export class ExpenseRepository extends BaseRepository<ExpenseDto> implements IExpenseRepository {
  constructor(@inject('db') db: any) {
    super(db);
  }

  async findById(id: string): Promise<ExpenseDto | null> {
    const rows = await this.db.select().from(expenses).where(eq(expenses.id, id));
    if (rows.length === 0) return null;
    return this.rowToDto(rows[0] as ExpenseRow);
  }

  async findAll(filters?: Partial<ExpenseDto>): Promise<ExpenseDto[]> {
    if (filters?.userId) {
      const rows = await this.db
        .select()
        .from(expenses)
        .where(eq(expenses.userId, filters.userId));
      return (rows as ExpenseRow[]).map((row) => this.rowToDto(row));
    }
    const rows = await this.db.select().from(expenses);
    return (rows as ExpenseRow[]).map((row) => this.rowToDto(row));
  }

  async save(entity: Omit<ExpenseDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExpenseDto> {
    const rows = await this.db
      .insert(expenses)
      .values({
        userId: entity.userId,
        categoryId: entity.categoryId,
        amount: String(entity.amount),
        description: entity.description,
        date: entity.date instanceof Date
          ? entity.date.toISOString().split('T')[0]
          : entity.date,
      })
      .returning();
    return this.rowToDto(rows[0] as ExpenseRow);
  }

  async update(
    id: string,
    partial: Partial<Omit<ExpenseDto, 'id' | 'createdAt'>>,
  ): Promise<ExpenseDto> {
    const setValues: Record<string, unknown> = { updatedAt: new Date() };
    if (partial.amount !== undefined) setValues['amount'] = String(partial.amount);
    if (partial.categoryId !== undefined) setValues['categoryId'] = partial.categoryId;
    if (partial.description !== undefined) setValues['description'] = partial.description;
    if (partial.date !== undefined) {
      setValues['date'] = partial.date instanceof Date
        ? partial.date.toISOString().split('T')[0]
        : partial.date;
    }

    const rows = await this.db
      .update(expenses)
      .set(setValues)
      .where(eq(expenses.id, id))
      .returning();
    return this.rowToDto(rows[0] as ExpenseRow);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(expenses).where(eq(expenses.id, id));
  }

  async findByUserAndPeriod(userId: string, month: number, year: number): Promise<ExpenseDto[]> {
    const { start, end } = getMonthPeriodDates(month, year);

    const rows = await this.db
      .select()
      .from(expenses)
      .where(and(eq(expenses.userId, userId), gte(expenses.date, start), lt(expenses.date, end)));
    return (rows as ExpenseRow[]).map((row) => this.rowToDto(row));
  }

  async findUncategorizedByUser(userId: string): Promise<ExpenseDto[]> {
    const rows = await this.db
      .select()
      .from(expenses)
      .where(and(eq(expenses.userId, userId), isNull(expenses.categoryId)));
    return (rows as ExpenseRow[]).map((row) => this.rowToDto(row));
  }

  async sumByUserAndPeriod(userId: string, month: number, year: number): Promise<number> {
    const { start, end } = getMonthPeriodDates(month, year);

    const [row] = await this.db
      .select({ total: sum(expenses.amount) })
      .from(expenses)
      .where(and(eq(expenses.userId, userId), gte(expenses.date, start), lt(expenses.date, end)));
    return parseFloat((row?.total as string) ?? '0');
  }

  private rowToDto(row: ExpenseRow): ExpenseDto {
    return {
      id: row.id,
      userId: row.userId,
      categoryId: row.categoryId ?? null,
      amount: parseFloat(row.amount as string),
      description: row.description ?? null,
      date: new Date(row.date as string),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
