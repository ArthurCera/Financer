export interface UserDto {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    role: 'user' | 'admin';
    createdAt: Date;
    updatedAt: Date;
}
export interface CategoryDto {
    id: string;
    name: string;
    color: string;
    icon: string;
    isDefault: boolean;
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
    period: {
        month: number;
        year: number;
    };
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
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    constructor(message: string, statusCode?: number, code?: string);
}
export declare class ValidationError extends AppError {
    readonly fields?: Record<string, string> | undefined;
    constructor(message: string, fields?: Record<string, string> | undefined);
}
export declare class NotFoundError extends AppError {
    constructor(resource: string, id: string);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class RateLimitError extends AppError {
    constructor(message?: string);
}
//# sourceMappingURL=index.d.ts.map