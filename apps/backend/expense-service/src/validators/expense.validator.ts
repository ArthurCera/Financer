import { z } from 'zod';

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((d) => !isNaN(new Date(d).getTime()), 'Must be a valid calendar date');

export const CreateExpenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  categoryId: z.string().uuid('Category ID must be a valid UUID').optional(),
  description: z.string().max(500, 'Description must be 500 characters or fewer').optional(),
  date: dateString,
});

export const UpdateExpenseSchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
  categoryId: z.string().uuid('Category ID must be a valid UUID').optional(),
  description: z.string().max(500, 'Description must be 500 characters or fewer').optional(),
  date: dateString.optional(),
});

export const PeriodSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

export const CreateCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#6B7280'),
  icon: z.string().trim().min(1).max(50).optional().default('tag'),
});

export const UpdateCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().trim().min(1).max(50).optional(),
});

export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseSchema>;
export type PeriodInput = z.infer<typeof PeriodSchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
