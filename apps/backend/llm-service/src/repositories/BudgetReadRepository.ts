import { injectable, inject } from 'tsyringe';
import {
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
export class BudgetReadRepository implements IBudgetRepository {
  constructor(@inject('db') private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<BudgetDto | null> {
    const rows = await this.db.select().from(budgets).where(eq(budgets.id, id));
    if (rows.length === 0) return null;
    return this.rowToDto(rows[0] as BudgetRow);
  }

  async findAll(filters?: Partial<BudgetDto>): Promise<BudgetDto[]> {
    if (filters?.userId) {
      const rows = await this.db.select().from(budgets).where(eq(budgets.userId, filters.userId));
      return (rows as BudgetRow[]).map((row) => this.rowToDto(row));
    }
    const rows = await this.db.select().from(budgets);
    return (rows as BudgetRow[]).map((row) => this.rowToDto(row));
  }

  async save(_entity: Omit<BudgetDto, 'id' | 'createdAt' | 'updatedAt'>): Promise<BudgetDto> {
    throw new Error('BudgetReadRepository does not support write operations');
  }

  async update(_id: string, _partial: Partial<Omit<BudgetDto, 'id' | 'createdAt'>>): Promise<BudgetDto> {
    throw new Error('BudgetReadRepository does not support write operations');
  }

  async delete(_id: string): Promise<void> {
    throw new Error('BudgetReadRepository does not support write operations');
  }

  async findByUserAndPeriod(userId: string, month: number, year: number): Promise<BudgetDto[]> {
    const rows = await this.db
      .select()
      .from(budgets)
      .where(and(eq(budgets.userId, userId), eq(budgets.month, month), eq(budgets.year, year)));
    return (rows as BudgetRow[]).map((row) => this.rowToDto(row));
  }

  async findTotalBudget(userId: string, month: number, year: number): Promise<BudgetDto | null> {
    const rows = await this.db
      .select()
      .from(budgets)
      .where(
        and(eq(budgets.userId, userId), eq(budgets.month, month), eq(budgets.year, year), isNull(budgets.categoryId)),
      );
    if (rows.length === 0) return null;
    return this.rowToDto(rows[0] as BudgetRow);
  }

  async findByUserAndPeriodPaginated(
    userId: string, month: number, year: number, limit: number, offset: number,
  ): Promise<BudgetDto[]> {
    const rows = await this.db
      .select()
      .from(budgets)
      .where(and(eq(budgets.userId, userId), eq(budgets.month, month), eq(budgets.year, year)))
      .limit(limit)
      .offset(offset);
    return (rows as BudgetRow[]).map((row) => this.rowToDto(row));
  }

  async countByUserAndPeriod(userId: string, month: number, year: number): Promise<number> {
    const [row] = await this.db
      .select({ count: count() })
      .from(budgets)
      .where(and(eq(budgets.userId, userId), eq(budgets.month, month), eq(budgets.year, year)));
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
