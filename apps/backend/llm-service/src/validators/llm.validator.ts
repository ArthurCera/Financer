import { z } from 'zod';

export const OCRSchema = z.object({
  imageBase64: z.string().min(1, 'Image data is required').max(14_000_000, 'Image data must be under 10MB'),
  mimeType: z.string().optional(),
});

export const CategorizeSchema = z.object({
  expenseId: z.string().uuid('Expense ID must be a valid UUID'),
});

export const CategorizeBatchSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  recategorizeAll: z.boolean().optional().default(false),
});

export const ChatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message must be 2000 characters or fewer'),
});

/** Validates structured JSON output from the LLM for OCR */
export const OCRExpenseSchema = z.object({
  amount: z.number().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().optional(),
  merchant: z.string().optional(),
  category: z.string().optional(),
});

export type OCRInput = z.infer<typeof OCRSchema>;
export type CategorizeInput = z.infer<typeof CategorizeSchema>;
export type CategorizeBatchInput = z.infer<typeof CategorizeBatchSchema>;
export type ChatInput = z.infer<typeof ChatSchema>;
