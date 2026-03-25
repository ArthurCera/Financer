import { z } from 'zod';

export const CreateIncomeSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().optional(),
  source: z.string().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

export const UpdateIncomeSchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
  description: z.string().optional(),
  source: z.string().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
});

export const PeriodSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

export type CreateIncomeInput = z.infer<typeof CreateIncomeSchema>;
export type UpdateIncomeInput = z.infer<typeof UpdateIncomeSchema>;
export type PeriodInput = z.infer<typeof PeriodSchema>;
