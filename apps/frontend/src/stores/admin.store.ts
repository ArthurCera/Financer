import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dashboardApi, unwrap } from '../services/api.service'
import type { AdminStatsResponse, AdminUserResponse, AdminLLMUsageResponse, DetailedLLMStatsResponse } from '@financer/shared'
import { extractErrorMessage } from '../utils/errors'

export const useAdminStore = defineStore('admin', () => {
  const stats = ref<AdminStatsResponse | null>(null)
  const users = ref<AdminUserResponse[]>([])
  const llmUsage = ref<AdminLLMUsageResponse | null>(null)
  const detailedLLMStats = ref<DetailedLLMStatsResponse | null>(null)
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

  async function fetchAll(): Promise<void> {
    loading.value = true
    error.value = null
    const results = await Promise.allSettled([
      dashboardApi.get<{ data: AdminStatsResponse }>('/admin/stats'),
      dashboardApi.get<{ data: AdminUserResponse[] }>('/admin/users'),
      dashboardApi.get<{ data: AdminLLMUsageResponse }>('/admin/llm-usage'),
      dashboardApi.get<{ data: DetailedLLMStatsResponse }>('/admin/llm-stats'),
    ])

    if (results[0].status === 'fulfilled') stats.value = unwrap(results[0].value)
    if (results[1].status === 'fulfilled') users.value = unwrap(results[1].value)
    if (results[2].status === 'fulfilled') llmUsage.value = unwrap(results[2].value)
    if (results[3].status === 'fulfilled') detailedLLMStats.value = unwrap(results[3].value)

    const failures = results.filter(r => r.status === 'rejected')
    if (failures.length > 0) {
      error.value = extractErrorMessage((failures[0] as PromiseRejectedResult).reason)
    }
    loading.value = false
  }

  async function updateUserRole(userId: string, role: 'user' | 'admin'): Promise<void> {
    try {
      await dashboardApi.put(`/admin/users/${userId}`, { role })
      const user = users.value.find(u => u.id === userId)
      if (user) user.role = role
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
    loading,
    error,
    fetchStats,
    fetchUsers,
    fetchLLMUsage,
    fetchDetailedLLMStats,
    fetchAll,
    updateUserRole,
  }
})
