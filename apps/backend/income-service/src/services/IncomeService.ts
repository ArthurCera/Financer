import { injectable, inject } from 'tsyringe';
import {
  IIncomeRepository,
  ICacheService,
  IncomeDto,
  findOwnedOrThrow,
  invalidateDashboardCache,
} from '@financer/backend-shared';
import { CreateIncomeRequest, UpdateIncomeRequest, IncomeResponse } from '@financer/shared';

@injectable()
export class IncomeService {
  constructor(
    @inject('IIncomeRepository') private readonly incomeRepo: IIncomeRepository,
    @inject('ICacheService') private readonly cache: ICacheService,
  ) {}

  async list(
    userId: string,
    month?: number,
    year?: number,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ items: IncomeResponse[]; total: number }> {
    let incomeList: IncomeDto[];
    let total: number;

    if (month !== undefined && year !== undefined) {
      [incomeList, total] = await Promise.all([
        this.incomeRepo.findByUserAndPeriodPaginated(userId, month, year, limit, offset),
        this.incomeRepo.countByUserAndPeriod(userId, month, year),
      ]);
    } else {
      [incomeList, total] = await Promise.all([
        this.incomeRepo.findByUserPaginated(userId, limit, offset),
        this.incomeRepo.countByUser(userId),
      ]);
    }

    const items = incomeList.map((income) => this.toResponse(income));
    return { items, total };
  }

  async create(userId: string, data: CreateIncomeRequest): Promise<IncomeResponse> {
    const income = await this.incomeRepo.save({
      userId,
      amount: data.amount,
      description: data.description ?? null,
      source: data.source ?? null,
      date: new Date(data.date) as unknown as Date,
    });
    await invalidateDashboardCache(this.cache, userId);
    return this.toResponse(income);
  }

  async update(
    userId: string,
    id: string,
    data: UpdateIncomeRequest,
  ): Promise<IncomeResponse> {
    await findOwnedOrThrow(this.incomeRepo, id, userId, 'Income');

    const partial: Partial<Omit<IncomeDto, 'id' | 'createdAt'>> = {};
    if (data.amount !== undefined) partial.amount = data.amount;
    if (data.description !== undefined) partial.description = data.description;
    if (data.source !== undefined) partial.source = data.source;
    if (data.date !== undefined) partial.date = new Date(data.date) as unknown as Date;

    const updated = await this.incomeRepo.update(id, partial);
    await invalidateDashboardCache(this.cache, userId);
    return this.toResponse(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    await findOwnedOrThrow(this.incomeRepo, id, userId, 'Income');
    await this.incomeRepo.delete(id);
    await invalidateDashboardCache(this.cache, userId);
  }

  toResponse(income: IncomeDto): IncomeResponse {
    const dateStr =
      income.date instanceof Date
        ? income.date.toISOString().split('T')[0]
        : String(income.date);

    return {
      id: income.id,
      userId: income.userId,
      amount: income.amount,
      description: income.description,
      source: income.source,
      date: dateStr,
      createdAt: income.createdAt.toISOString(),
      updatedAt: income.updatedAt.toISOString(),
    };
  }
}
