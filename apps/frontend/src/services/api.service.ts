import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { AuthTokens } from '@financer/shared'

// Token accessor — set by auth store after it initialises to break circular dep
let _getAccessToken: (() => string | null) | null = null
let _refreshTokens: (() => Promise<AuthTokens>) | null = null
let _logout: (() => void) | null = null

/** Get the current access token (used by SSE streaming) */
export function getAccessToken(): string | null {
  return _getAccessToken?.() ?? null
}

export function registerAuthHandlers(handlers: {
  getAccessToken: () => string | null
  refreshTokens: () => Promise<AuthTokens>
  logout: () => void
}): void {
  _getAccessToken = handlers.getAccessToken
  _refreshTokens = handlers.refreshTokens
  _logout = handlers.logout
}

// Shared token refresh state across all API instances to prevent parallel
// refresh attempts when multiple services return 401 simultaneously.
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
  config: AxiosRequestConfig
  instance: AxiosInstance
}> = []

function processQueue(error: unknown, token: string | null): void {
  failedQueue.forEach(({ resolve, reject, config, instance }) => {
    if (token) {
      ;(config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
      resolve(instance(config))
    } else {
      reject(error)
    }
  })
  failedQueue = []
}

function createApiInstance(baseURL: string, timeout = 15_000): AxiosInstance {
  const instance = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    timeout,
  })

  // Request interceptor — attach Bearer token
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = _getAccessToken?.()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  // Response interceptor — handle 401 with token refresh + single retry
  instance.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (!axios.isAxiosError(error)) return Promise.reject(error)

      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject, config: originalRequest, instance })
          })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          if (!_refreshTokens) throw new Error('No refresh handler registered')
          const tokens = await Promise.race([
            _refreshTokens(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Token refresh timeout')), 5000),
            ),
          ])
          processQueue(null, tokens.accessToken)
          ;(originalRequest.headers as Record<string, string>)['Authorization'] =
            `Bearer ${tokens.accessToken}`
          return instance(originalRequest)
        } catch (refreshError) {
          processQueue(refreshError, null)
          _logout?.()
          // Redirect to login via router (dynamic import avoids circular dep)
          const { default: router } = await import('../router')
          await router.push('/login')
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }

      return Promise.reject(error)
    }
  )

  return instance
}

export const authApi = createApiInstance(
  (import.meta.env.VITE_AUTH_URL as string | undefined) ?? 'http://localhost:3001'
)
export const expenseApi = createApiInstance(
  (import.meta.env.VITE_EXPENSE_URL as string | undefined) ?? 'http://localhost:3002'
)
export const budgetApi = createApiInstance(
  (import.meta.env.VITE_BUDGET_URL as string | undefined) ?? 'http://localhost:3003'
)
export const incomeApi = createApiInstance(
  (import.meta.env.VITE_INCOME_URL as string | undefined) ?? 'http://localhost:3004'
)
export const dashboardApi = createApiInstance(
  (import.meta.env.VITE_DASHBOARD_URL as string | undefined) ?? 'http://localhost:3005'
)
export const llmApi = createApiInstance(
  (import.meta.env.VITE_LLM_URL as string | undefined) ?? 'http://localhost:3006',
  30_000,
)

// Helper to unwrap ApiResponse<T> envelope: { success: true, data: T }
export function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data
}

// Helper to unwrap paginated response: { success: true, data: T[], pagination: {...} }
export interface PaginationMeta {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function unwrapPaginated<T>(
  response: { data: { data: T[]; pagination: PaginationMeta } },
): { items: T[]; pagination: PaginationMeta } {
  return { items: response.data.data, pagination: response.data.pagination }
}

export type { AuthTokens }
