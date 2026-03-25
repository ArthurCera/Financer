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

export function registerAuthHandlers(handlers: {
  getAccessToken: () => string | null
  refreshTokens: () => Promise<AuthTokens>
  logout: () => void
}): void {
  _getAccessToken = handlers.getAccessToken
  _refreshTokens = handlers.refreshTokens
  _logout = handlers.logout
}

function createApiInstance(baseURL: string): AxiosInstance {
  const instance = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15_000,
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
  let isRefreshing = false
  let failedQueue: Array<{
    resolve: (value: unknown) => void
    reject: (reason?: unknown) => void
    config: AxiosRequestConfig
  }> = []

  const processQueue = (error: unknown, token: string | null): void => {
    failedQueue.forEach(({ resolve, reject, config }) => {
      if (token) {
        ;(config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
        resolve(instance(config))
      } else {
        reject(error)
      }
    })
    failedQueue = []
  }

  instance.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (!axios.isAxiosError(error)) return Promise.reject(error)

      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject, config: originalRequest })
          })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          if (!_refreshTokens) throw new Error('No refresh handler registered')
          const tokens = await _refreshTokens()
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
  (import.meta.env.VITE_LLM_URL as string | undefined) ?? 'http://localhost:3006'
)

// Helper to unwrap ApiResponse<T> envelope: { success: true, data: T }
export function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data
}

export type { AuthTokens }
