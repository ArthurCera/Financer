import { z } from 'zod';

const currentDate = () => new Date();

export const PeriodArgsSchema = z.object({
  month: z.number().int().min(1).max(12).optional().default(() => currentDate().getMonth() + 1),
  year: z.number().int().min(2000).max(2100).optional().default(() => currentDate().getFullYear()),
});

export const GetExpensesArgsSchema = PeriodArgsSchema.extend({
  limit: z.number().int().min(1).max(50).optional().default(20),
});

export const GetBudgetsArgsSchema = PeriodArgsSchema;
export const GetIncomeArgsSchema = PeriodArgsSchema;
export const GetExpenseSummaryArgsSchema = PeriodArgsSchema;
export const GetIncomeSummaryArgsSchema = PeriodArgsSchema;

// get_categories takes no arguments
export const GetCategoriesArgsSchema = z.object({});
