/**
 * API response envelopes and request/response types shared by
 * the Vue frontend (service layer) and backend (controllers).
 *
 * Using a consistent envelope ensures the frontend can always
 * rely on the same shape for success and error responses.
 */
export interface ApiResponse<T> {
    success: true;
    data: T;
}
export interface ApiError {
    success: false;
    error: {
        code: string;
        message: string;
        fields?: Record<string, string>;
    };
}
export type ApiResult<T> = ApiResponse<T> | ApiError;
export interface PaginationMeta {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
export interface PaginatedResponse<T> {
    success: true;
    data: T[];
    pagination: PaginationMeta;
}
export interface LoginRequest {
    email: string;
    password: string;
}
export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export interface UpdateBudgetRequest {
    amount?: number;
}
export interface UserProfile {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
    createdAt: string;
}
export interface CategoryResponse {
    id: string;
    name: string;
    color: string;
    icon: string;
    isDefault: boolean;
    createdAt: string;
}
export interface CreateCategoryRequest {
    name: string;
    color?: string;
    icon?: string;
}
export interface UpdateCategoryRequest {
    name?: string;
    color?: string;
    icon?: string;
}
export interface CreateExpenseRequest {
    categoryId?: string;
    amount: number;
    description?: string;
    date: string;
}
export interface UpdateExpenseRequest {
    categoryId?: string;
    amount?: number;
    description?: string;
    date?: string;
}
export interface ExpenseResponse {
    id: string;
    userId: string;
    categoryId: string | null;
    categoryName: string | null;
    amount: number;
    description: string | null;
    date: string;
    createdAt: string;
    updatedAt: string;
}
export interface CreateBudgetRequest {
    categoryId?: string;
    amount: number;
    month: number;
    year: number;
}
export interface BudgetResponse {
    id: string;
    userId: string;
    categoryId: string | null;
    categoryName: string | null;
    amount: number;
    month: number;
    year: number;
    createdAt: string;
    updatedAt: string;
}
export interface CreateIncomeRequest {
    amount: number;
    description?: string;
    source?: string;
    date: string;
}
export interface UpdateIncomeRequest {
    amount?: number;
    description?: string;
    source?: string;
    date?: string;
}
export interface IncomeResponse {
    id: string;
    userId: string;
    amount: number;
    description: string | null;
    source: string | null;
    date: string;
    createdAt: string;
    updatedAt: string;
}
export interface DashboardResponse {
    period: {
        month: number;
        year: number;
    };
    totalExpenses: number;
    totalIncome: number;
    totalBudget: number;
    allTimeNetSavings: number;
    expensesByCategory: CategoryBreakdownResponse[];
    budgetVsActual: BudgetComparisonResponse[];
    recentExpenses: DashboardExpenseItem[];
    llmStats: UserLLMStats;
}
export interface DashboardExpenseItem {
    id: string;
    amount: number;
    description: string | null;
    categoryName: string | null;
    date: string;
}
export interface UserLLMStats {
    chatMessageCount: number;
    categorizationsCount: number;
    lastChatAt: string | null;
}
export interface CategoryBreakdownResponse {
    categoryId: string;
    categoryName: string;
    color: string;
    total: number;
    percentage: number;
}
export interface BudgetComparisonResponse {
    categoryId: string | null;
    categoryName: string;
    budgeted: number;
    spent: number;
    remaining: number;
    percentage: number;
}
export interface OCRRequest {
    imageBase64: string;
    mimeType?: string;
}
export interface OCRExpenseData {
    amount?: number;
    date?: string;
    description?: string;
    merchant?: string;
    category?: string;
}
export interface OCRResponse {
    text: string;
    expense?: OCRExpenseData;
}
export interface CategorizeRequest {
    expenseId: string;
}
export interface CategorizeBatchRequest {
    month: number;
    year: number;
}
export interface CategorizeResponse {
    expenseId: string;
    categoryId: string;
    categoryName: string;
    confidence: number;
}
export interface ChatRequest {
    message: string;
}
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}
export interface ChatResponse {
    reply: ChatMessage;
}
export interface ChatHistoryResponse {
    messages: ChatMessage[];
}
export interface AdminUserResponse {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
    createdAt: string;
    expenseCount: number;
    totalSpent: number;
}
export interface AdminStatsResponse {
    totalUsers: number;
    totalExpenses: number;
    totalIncome: number;
    totalLLMChats: number;
    totalCategorizationsRun: number;
}
export interface AdminLLMUsageResponse {
    users: Array<{
        userId: string;
        email: string;
        name: string;
        chatMessageCount: number;
        lastChatAt: string | null;
    }>;
    totalMessages: number;
}
export interface DetailedLLMStatsResponse {
    totalChats: number;
    totalMessages: number;
    avgMessagesPerUser: number;
    activeUsersLast7Days: number;
    messagesLast7Days: number;
    messagesLast30Days: number;
    topUsers: Array<{
        userId: string;
        name: string;
        email: string;
        messageCount: number;
    }>;
}
//# sourceMappingURL=api-types.d.ts.map