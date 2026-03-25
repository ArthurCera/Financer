import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dashboardApi, unwrap } from '../services/api.service'
import { extractErrorMessage } from '../utils/errors'
import type { DashboardResponse } from '@financer/shared'

export const useDashboardStore = defineStore('dashboard', () => {
  const dashboard = ref<DashboardResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchDashboard(month: number, year: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      dashboard.value = unwrap<DashboardResponse>(
        await dashboardApi.get<{ data: DashboardResponse }>('/dashboard', {
          params: { month, year },
        })
      )
    } catch (err) {
      error.value = extractErrorMessage(err)
    } finally {
      loading.value = false
    }
  }

  return { dashboard, loading, error, fetchDashboard }
})

