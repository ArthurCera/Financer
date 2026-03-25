// =============================================================================
// Shared Backend Types
//
// These are plain interfaces (no classes). They represent the shape of domain
// objects as they flow through the backend. Services depend on these DTOs,
// never on raw ORM models.
// =============================================================================

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export type UserRole = 'superadmin' | 'admin' | 'user';

// ---------------------------------------------------------------------------
// Domain DTOs
// ---------------------------------------------------------------------------

export interface UserDto {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  managedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryDto {
  id: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  userId: string | null;
  createdAt: Date;
}

export interface ExpenseDto {
  id: string;
  userId: string;
  categoryId: string | null;
  amount: number;
  description: string | null;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetDto {
  id: string;
  userId: string;
  categoryId: string | null;
  amount: number;
  month: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IncomeDto {
  id: string;
  userId: string;
  amount: number;
  description: string | null;
  source: string | null;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LLMChatDto {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export interface DashboardDto {
  period: { month: number; year: number };
  totalExpenses: number;
  totalIncome: number;
  totalBudget: number;
  expensesByCategory: CategoryBreakdown[];
  budgetVsActual: BudgetComparison[];
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  color: string;
  total: number;
  percentage: number;
}

export interface BudgetComparison {
  categoryId: string | null;
  categoryName: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentage: number;
}

// ---------------------------------------------------------------------------
// Error Types
// ---------------------------------------------------------------------------

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = 'INTERNAL_ERROR',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly fields?: Record<string, string>) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded. Try again in a minute.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}
