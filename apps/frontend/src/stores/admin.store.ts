import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dashboardApi, unwrap } from '../services/api.service'
import type { AdminStatsResponse, AdminUserResponse, AdminLLMUsageResponse } from '@financer/shared'
import { extractErrorMessage } from '../utils/errors'

export const useAdminStore = defineStore('admin', () => {
  const stats = ref<AdminStatsResponse | null>(null)
  const users = ref<AdminUserResponse[]>([])
  const llmUsage = ref<AdminLLMUsageResponse | null>(null)
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

  async function fetchAll(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const [statsRes, usersRes, llmRes] = await Promise.all([
        dashboardApi.get<{ data: AdminStatsResponse }>('/admin/stats'),
        dashboardApi.get<{ data: AdminUserResponse[] }>('/admin/users'),
        dashboardApi.get<{ data: AdminLLMUsageResponse }>('/admin/llm-usage'),
      ])
      stats.value = unwrap(statsRes)
      users.value = unwrap(usersRes)
      llmUsage.value = unwrap(llmRes)
    } catch (err: unknown) {
      error.value = extractErrorMessage(err)
    } finally {
      loading.value = false
    }
  }

  return {
    stats,
    users,
    llmUsage,
    loading,
    error,
    fetchStats,
    fetchUsers,
    fetchLLMUsage,
    fetchAll,
  }
})
