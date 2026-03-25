import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dashboardApi, unwrap } from '../services/api.service'
import type {
  AdminStatsResponse,
  AdminUserResponse,
  AdminLLMUsageResponse,
  DetailedLLMStatsResponse,
  CategoryBreakdownResponse,
  CategoryCountResponse,
  AdminSubAccountDetailResponse,
} from '@financer/shared'
import { extractErrorMessage } from '../utils/errors'
import { useAuthStore } from './auth.store'

export const useAdminStore = defineStore('admin', () => {
  const stats = ref<AdminStatsResponse | null>(null)
  const users = ref<AdminUserResponse[]>([])
  const llmUsage = ref<AdminLLMUsageResponse | null>(null)
  const detailedLLMStats = ref<DetailedLLMStatsResponse | null>(null)
  const expensesByCategory = ref<CategoryBreakdownResponse[]>([])
  const categoryCounts = ref<CategoryCountResponse[]>([])
  const periodTotals = ref<{ totalIncome: number; totalExpenseAmount: number }>({ totalIncome: 0, totalExpenseAmount: 0 })
  const selectedSubAccountId = ref<string | null>(null)
  const subAccountDetail = ref<AdminSubAccountDetailResponse | null>(null)
  const subAccountLoading = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchStats(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      stats.value = unwrap<AdminStatsResponse>(
        await dashboardApi.get<{ data: AdminStatsResponse }>('/admin/stats')
      )
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
    } finally {
      loading.value = false
    }
  }

  async function fetchUsers(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      users.value = unwrap<AdminUserResponse[]>(
        await dashboardApi.get<{ data: AdminUserResponse[] }>('/admin/users')
      )
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
    } finally {
      loading.value = false
    }
  }

  async function fetchLLMUsage(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      llmUsage.value = unwrap<AdminLLMUsageResponse>(
        await dashboardApi.get<{ data: AdminLLMUsageResponse }>('/admin/llm-usage')
      )
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
    } finally {
      loading.value = false
    }
  }

  async function fetchDetailedLLMStats(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      detailedLLMStats.value = unwrap<DetailedLLMStatsResponse>(
        await dashboardApi.get<{ data: DetailedLLMStatsResponse }>('/admin/llm-stats')
      )
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
    } finally {
      loading.value = false
    }
  }

  async function fetchExpensesByCategory(month?: number, year?: number): Promise<void> {
    try {
      const params: Record<string, string | number> = {}
      if (month !== undefined && year !== undefined) {
        params.month = month
        params.year = year
      } else {
        params.all = 'true'
      }
      expensesByCategory.value = unwrap<CategoryBreakdownResponse[]>(
        await dashboardApi.get('/admin/expenses-by-category', { params })
      )
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
    }
  }

  async function fetchCategoryCounts(month?: number, year?: number): Promise<void> {
    try {
      const params: Record<string, string | number> = {}
      if (month !== undefined && year !== undefined) {
        params.month = month
        params.year = year
      } else {
        params.all = 'true'
      }
      categoryCounts.value = unwrap<CategoryCountResponse[]>(
        await dashboardApi.get('/admin/category-counts', { params })
      )
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
    }
  }

  async function fetchPeriodTotals(month?: number, year?: number): Promise<void> {
    try {
      const params: Record<string, string | number> = {}
      if (month !== undefined && year !== undefined) {
        params.month = month
        params.year = year
      } else {
        params.all = 'true'
      }
      periodTotals.value = unwrap<{ totalIncome: number; totalExpenseAmount: number }>(
        await dashboardApi.get('/admin/period-totals', { params })
      )
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
    }
  }

  async function fetchSubAccountDetail(
    subAccountId: string,
    month?: number,
    year?: number,
  ): Promise<void> {
    subAccountLoading.value = true
    try {
      const params: Record<string, string | number> = {}
      if (month !== undefined && year !== undefined) {
        params.month = month
        params.year = year
      } else {
        params.all = 'true'
      }
      subAccountDetail.value = unwrap<AdminSubAccountDetailResponse>(
        await dashboardApi.get(`/admin/sub-accounts/${subAccountId}/detail`, { params })
      )
      selectedSubAccountId.value = subAccountId
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
    } finally {
      subAccountLoading.value = false
    }
  }

  function clearSubAccountDetail(): void {
    selectedSubAccountId.value = null
    subAccountDetail.value = null
  }

  async function fetchAll(): Promise<void> {
    loading.value = true
    error.value = null

    const auth = useAuthStore()
    const isSuperAdmin = auth.user?.role === 'superadmin'

    const promises: Promise<unknown>[] = [
      dashboardApi.get<{ data: AdminStatsResponse }>('/admin/stats'),
      dashboardApi.get<{ data: AdminUserResponse[] }>('/admin/users'),
    ]
    if (isSuperAdmin) {
      promises.push(
        dashboardApi.get<{ data: AdminLLMUsageResponse }>('/admin/llm-usage'),
        dashboardApi.get<{ data: DetailedLLMStatsResponse }>('/admin/llm-stats'),
      )
    } else {
      const now = new Date()
      const defaultMonth = now.getMonth() + 1
      const defaultYear = now.getFullYear()
      promises.push(
        dashboardApi.get('/admin/expenses-by-category', { params: { month: defaultMonth, year: defaultYear } }),
        dashboardApi.get('/admin/category-counts', { params: { month: defaultMonth, year: defaultYear } }),
        dashboardApi.get('/admin/period-totals', { params: { month: defaultMonth, year: defaultYear } }),
      )
    }

    const results = await Promise.allSettled(promises)

    if (results[0]?.status === 'fulfilled') stats.value = unwrap(results[0].value as { data: { data: AdminStatsResponse } })
    if (results[1]?.status === 'fulfilled') users.value = unwrap(results[1].value as { data: { data: AdminUserResponse[] } })
    if (isSuperAdmin) {
      if (results[2]?.status === 'fulfilled') llmUsage.value = unwrap(results[2].value as { data: { data: AdminLLMUsageResponse } })
      if (results[3]?.status === 'fulfilled') detailedLLMStats.value = unwrap(results[3].value as { data: { data: DetailedLLMStatsResponse } })
    } else {
      if (results[2]?.status === 'fulfilled') expensesByCategory.value = unwrap(results[2].value as { data: { data: CategoryBreakdownResponse[] } })
      if (results[3]?.status === 'fulfilled') categoryCounts.value = unwrap(results[3].value as { data: { data: CategoryCountResponse[] } })
      if (results[4]?.status === 'fulfilled') periodTotals.value = unwrap(results[4].value as { data: { data: { totalIncome: number; totalExpenseAmount: number } } })
    }

    // Only treat stats/users failures as errors — chart endpoint failures are non-blocking
    const essentialFailures = results.slice(0, 2).filter(r => r.status === 'rejected')
    if (essentialFailures.length > 0) {
      error.value = extractErrorMessage((essentialFailures[0] as PromiseRejectedResult).reason)
    }
    loading.value = false
  }

  async function updateUserRole(userId: string, role: 'user' | 'admin'): Promise<void> {
    try {
      await dashboardApi.put(`/admin/users/${userId}`, { role })
      const user = users.value.find(u => u.id === userId)
      if (user) user.role = role

      const auth = useAuthStore()
      if (userId === auth.user?.id) {
        await auth.refreshTokens()
        await auth.fetchProfile()

        if (role !== 'admin') {
          const { default: router } = await import('../router')
          await router.push('/dashboard')
        }
      }
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
      throw err
    }
  }

  return {
    stats,
    users,
    llmUsage,
    detailedLLMStats,
    expensesByCategory,
    categoryCounts,
    selectedSubAccountId,
    subAccountDetail,
    subAccountLoading,
    loading,
    error,
    fetchStats,
    fetchUsers,
    fetchLLMUsage,
    fetchDetailedLLMStats,
    fetchExpensesByCategory,
    fetchCategoryCounts,
    fetchPeriodTotals,
    periodTotals,
    fetchSubAccountDetail,
    clearSubAccountDetail,
    fetchAll,
    updateUserRole,
  }
})
