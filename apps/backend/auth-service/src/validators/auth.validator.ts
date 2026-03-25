import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('Must be a valid email address').max(255, 'Email must be 255 characters or fewer').transform((e) => e.toLowerCase().trim()),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be 128 characters or fewer'),
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or fewer').transform((n) => n.trim()),
});

export const LoginSchema = z.object({
  email: z.string().email('Must be a valid email address').transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshInput = z.infer<typeof RefreshSchema>;
