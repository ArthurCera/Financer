import { z } from 'zod';

export const CreateBudgetSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  categoryId: z.string().uuid('Category ID must be a valid UUID').optional(),
  month: z.number().int().min(1, 'Month must be between 1 and 12').max(12, 'Month must be between 1 and 12'),
  year: z.number().int().min(2000, 'Year must be 2000 or later'),
});

export const UpdateBudgetSchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
});

export const PeriodSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

export type CreateBudgetInput = z.infer<typeof CreateBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof UpdateBudgetSchema>;
export type PeriodInput = z.infer<typeof PeriodSchema>;
