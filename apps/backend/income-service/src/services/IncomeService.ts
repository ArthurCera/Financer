import { injectable, inject } from 'tsyringe';
import {
  IIncomeRepository,
  IncomeDto,
  NotFoundError,
} from '@financer/backend-shared';
import { CreateIncomeRequest, UpdateIncomeRequest, IncomeResponse } from '@financer/shared';

@injectable()
export class IncomeService {
  constructor(
    @inject('IIncomeRepository') private readonly incomeRepo: IIncomeRepository,
  ) {}

  async list(userId: string, month?: number, year?: number): Promise<IncomeResponse[]> {
    let incomeList: IncomeDto[];
    if (month !== undefined && year !== undefined) {
      incomeList = await this.incomeRepo.findByUserAndPeriod(userId, month, year);
    } else {
      incomeList = await this.incomeRepo.findAll({ userId });
    }
    return incomeList.map((income) => this.toResponse(income));
  }

  async create(userId: string, data: CreateIncomeRequest): Promise<IncomeResponse> {
    const income = await this.incomeRepo.save({
      userId,
      amount: data.amount,
      description: data.description ?? null,
      source: data.source ?? null,
      date: new Date(data.date) as unknown as Date,
    });
    return this.toResponse(income);
  }

  async update(
    userId: string,
    id: string,
    data: UpdateIncomeRequest,
  ): Promise<IncomeResponse> {
    const existing = await this.incomeRepo.findById(id);
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError('Income', id);
    }

    const partial: Partial<Omit<IncomeDto, 'id' | 'createdAt'>> = {};
    if (data.amount !== undefined) partial.amount = data.amount;
    if (data.description !== undefined) partial.description = data.description;
    if (data.source !== undefined) partial.source = data.source;
    if (data.date !== undefined) partial.date = new Date(data.date) as unknown as Date;

    const updated = await this.incomeRepo.update(id, partial);
    return this.toResponse(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.incomeRepo.findById(id);
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError('Income', id);
    }
    await this.incomeRepo.delete(id);
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
