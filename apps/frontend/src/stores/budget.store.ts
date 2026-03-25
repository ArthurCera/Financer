import { defineStore } from 'pinia'
import { ref } from 'vue'
import { budgetApi, unwrap } from '../services/api.service'
import type {
  BudgetResponse,
  CreateBudgetRequest,
  UpdateBudgetRequest,
} from '@financer/shared'

export const useBudgetStore = defineStore('budgets', () => {
  const budgets = ref<BudgetResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchBudgets(month?: number, year?: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const params: Record<string, number> = {}
      if (month !== undefined) params['month'] = month
      if (year !== undefined) params['year'] = year
      budgets.value = unwrap<BudgetResponse[]>(
        await budgetApi.get<{ data: BudgetResponse[] }>('/budgets', { params })
      )
    } catch (err) {
      error.value = extractMessage(err)
    } finally {
      loading.value = false
    }
  }

  async function createBudget(data: CreateBudgetRequest): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const created = unwrap<BudgetResponse>(
        await budgetApi.post<{ data: BudgetResponse }>('/budgets', data)
      )
      budgets.value.unshift(created)
    } catch (err) {
      error.value = extractMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateBudget(id: string, data: UpdateBudgetRequest): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const updated = unwrap<BudgetResponse>(
        await budgetApi.patch<{ data: BudgetResponse }>(`/budgets/${id}`, data)
      )
      const idx = budgets.value.findIndex((b) => b.id === id)
      if (idx !== -1) budgets.value[idx] = updated
    } catch (err) {
      error.value = extractMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteBudget(id: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await budgetApi.delete(`/budgets/${id}`)
      budgets.value = budgets.value.filter((b) => b.id !== id)
    } catch (err) {
      error.value = extractMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return { budgets, loading, error, fetchBudgets, createBudget, updateBudget, deleteBudget }
})

function extractMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { error?: { message?: string } } } }).response
    return res?.data?.error?.message ?? 'An unexpected error occurred'
  }
  return 'An unexpected error occurred'
}
