import { injectable, inject } from 'tsyringe';
import {
  IToolService,
  ToolDefinition,
  ToolCallRequest,
  ToolCallResult,
  IExpenseRepository,
  ICategoryRepository,
  IBudgetRepository,
  IIncomeRepository,
} from '@financer/backend-shared';
import {
  GetExpensesArgsSchema,
  GetExpenseSummaryArgsSchema,
  GetBudgetsArgsSchema,
  GetIncomeArgsSchema,
  GetIncomeSummaryArgsSchema,
  GetCategoriesArgsSchema,
} from './tool-schemas';

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_expenses',
    description: 'List the user\'s expenses for a given month and year. Returns individual expense entries with description, amount, category, and date.',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'number', description: 'Month (1-12). Defaults to current month.' },
        year: { type: 'number', description: 'Year (e.g. 2026). Defaults to current year.' },
        limit: { type: 'number', description: 'Max number of expenses to return (1-50). Defaults to 20.' },
      },
    },
  },
  {
    name: 'get_expense_summary',
    description: 'Get a summary of spending by category for a given month. Returns total spending and per-category breakdown.',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'number', description: 'Month (1-12). Defaults to current month.' },
        year: { type: 'number', description: 'Year (e.g. 2026). Defaults to current year.' },
      },
    },
  },
  {
    name: 'get_budgets',
    description: 'List the user\'s budgets for a given month and year. Returns budget entries with category name and amount.',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'number', description: 'Month (1-12). Defaults to current month.' },
        year: { type: 'number', description: 'Year (e.g. 2026). Defaults to current year.' },
      },
    },
  },
  {
    name: 'get_income',
    description: 'List the user\'s income entries for a given month. Returns individual entries with amount, source, and date.',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'number', description: 'Month (1-12). Defaults to current month.' },
        year: { type: 'number', description: 'Year (e.g. 2026). Defaults to current year.' },
      },
    },
  },
  {
    name: 'get_income_summary',
    description: 'Get total income for a given month and year.',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'number', description: 'Month (1-12). Defaults to current month.' },
        year: { type: 'number', description: 'Year (e.g. 2026). Defaults to current year.' },
      },
    },
  },
  {
    name: 'get_categories',
    description: 'List all available expense/income categories for the user, including system defaults and user-created custom categories.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
];

type ToolHandler = (userId: string, args: Record<string, unknown>) => Promise<unknown>;

@injectable()
export class FinancialToolService implements IToolService {
  private readonly handlers: Map<string, ToolHandler>;

  constructor(
    @inject('IExpenseRepository') private readonly expenseRepo: IExpenseRepository,
    @inject('IBudgetRepository') private readonly budgetRepo: IBudgetRepository,
    @inject('IIncomeRepository') private readonly incomeRepo: IIncomeRepository,
    @inject('ICategoryRepository') private readonly categoryRepo: ICategoryRepository,
  ) {
    this.handlers = new Map<string, ToolHandler>([
      ['get_expenses', (uid, args) => this.getExpenses(uid, args)],
      ['get_expense_summary', (uid, args) => this.getExpenseSummary(uid, args)],
      ['get_budgets', (uid, args) => this.getBudgets(uid, args)],
      ['get_income', (uid, args) => this.getIncome(uid, args)],
      ['get_income_summary', (uid, args) => this.getIncomeSummary(uid, args)],
      ['get_categories', (uid, _args) => this.getCategories(uid)],
    ]);
  }

  listTools(): ToolDefinition[] {
    return TOOL_DEFINITIONS;
  }

  async executeTool(userId: string, call: ToolCallRequest): Promise<ToolCallResult> {
    const handler = this.handlers.get(call.name);
    if (!handler) {
      return { name: call.name, result: null, error: `Unknown tool: ${call.name}` };
    }

    try {
      const result = await handler(userId, call.arguments);
      return { name: call.name, result };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Tool execution failed';
      console.error(`[ToolService] ${call.name} failed for user ${userId}:`, msg);
      return { name: call.name, result: null, error: msg };
    }
  }

  private async getExpenses(userId: string, args: Record<string, unknown>): Promise<unknown> {
    const { month, year, limit } = GetExpensesArgsSchema.parse(args);
    const expenses = await this.expenseRepo.findByUserAndPeriod(userId, month, year);
    const categories = await this.categoryRepo.findForUser(userId);
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    return expenses.slice(0, limit).map((e) => ({
      description: e.description ?? 'No description',
      amount: e.amount,
      category: catMap.get(e.categoryId ?? '') ?? 'Uncategorized',
      date: e.date instanceof Date ? e.date.toISOString().split('T')[0] : e.date,
    }));
  }

  private async getExpenseSummary(userId: string, args: Record<string, unknown>): Promise<unknown> {
    const { month, year } = GetExpenseSummaryArgsSchema.parse(args);
    const total = await this.expenseRepo.sumByUserAndPeriod(userId, month, year);
    const byCategory = await this.expenseRepo.sumByCategoryAndPeriod(userId, month, year);

    return {
      month,
      year,
      totalSpending: total,
      byCategory: byCategory.map((r) => ({
        category: r.categoryName ?? 'Uncategorized',
        amount: r.total,
      })),
    };
  }

  private async getBudgets(userId: string, args: Record<string, unknown>): Promise<unknown> {
    const { month, year } = GetBudgetsArgsSchema.parse(args);
    const budgetList = await this.budgetRepo.findByUserAndPeriod(userId, month, year);
    const categories = await this.categoryRepo.findForUser(userId);
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    return budgetList.map((b) => ({
      category: b.categoryId ? catMap.get(b.categoryId) ?? 'Unknown' : 'Total Budget',
      amount: b.amount,
      month: b.month,
      year: b.year,
    }));
  }

  private async getIncome(userId: string, args: Record<string, unknown>): Promise<unknown> {
    const { month, year } = GetIncomeArgsSchema.parse(args);
    const incomeList = await this.incomeRepo.findByUserAndPeriod(userId, month, year);

    return incomeList.map((i) => ({
      source: i.source ?? 'Unknown source',
      description: i.description ?? 'No description',
      amount: i.amount,
      date: i.date instanceof Date ? i.date.toISOString().split('T')[0] : i.date,
    }));
  }

  private async getIncomeSummary(userId: string, args: Record<string, unknown>): Promise<unknown> {
    const { month, year } = GetIncomeSummaryArgsSchema.parse(args);
    const total = await this.incomeRepo.sumByUserAndPeriod(userId, month, year);

    return { month, year, totalIncome: total };
  }

  private async getCategories(userId: string): Promise<unknown> {
    const categories = await this.categoryRepo.findForUser(userId);
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      isDefault: c.isDefault,
    }));
  }
}
