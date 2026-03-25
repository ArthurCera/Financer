import { z } from 'zod';

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((d) => !isNaN(new Date(d).getTime()), 'Must be a valid calendar date');

export const CreateIncomeSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().max(500, 'Description must be 500 characters or fewer').optional(),
  source: z.string().max(255, 'Source must be 255 characters or fewer').optional(),
  date: dateString,
});

export const UpdateIncomeSchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
  description: z.string().max(500, 'Description must be 500 characters or fewer').optional(),
  source: z.string().max(255, 'Source must be 255 characters or fewer').optional(),
  date: dateString.optional(),
});

export const PeriodSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

export type CreateIncomeInput = z.infer<typeof CreateIncomeSchema>;
export type UpdateIncomeInput = z.infer<typeof UpdateIncomeSchema>;
export type PeriodInput = z.infer<typeof PeriodSchema>;
