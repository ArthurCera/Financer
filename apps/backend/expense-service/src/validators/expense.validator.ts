import { z } from 'zod';

export const CreateExpenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  categoryId: z.string().uuid('Category ID must be a valid UUID').optional(),
  description: z.string().max(500, 'Description must be 500 characters or fewer').optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

export const UpdateExpenseSchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
  categoryId: z.string().uuid('Category ID must be a valid UUID').optional(),
  description: z.string().max(500, 'Description must be 500 characters or fewer').optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
});

export const PeriodSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseSchema>;
export type PeriodInput = z.infer<typeof PeriodSchema>;
