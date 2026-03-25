import { defineStore } from 'pinia'
import { ref } from 'vue'
import { expenseApi, unwrap } from '../services/api.service'
import type {
  ExpenseResponse,
  CreateExpenseRequest,
  UpdateExpenseRequest,
} from '@financer/shared'

export const useExpenseStore = defineStore('expenses', () => {
  const expenses = ref<ExpenseResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchExpenses(month?: number, year?: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const params: Record<string, number> = {}
      if (month !== undefined) params['month'] = month
      if (year !== undefined) params['year'] = year
      expenses.value = unwrap<ExpenseResponse[]>(
        await expenseApi.get<{ data: ExpenseResponse[] }>('/expenses', { params })
      )
    } catch (err) {
      error.value = extractMessage(err)
    } finally {
      loading.value = false
    }
  }

  async function createExpense(data: CreateExpenseRequest): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const created = unwrap<ExpenseResponse>(
        await expenseApi.post<{ data: ExpenseResponse }>('/expenses', data)
      )
      expenses.value.unshift(created)
    } catch (err) {
      error.value = extractMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateExpense(id: string, data: UpdateExpenseRequest): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const updated = unwrap<ExpenseResponse>(
        await expenseApi.patch<{ data: ExpenseResponse }>(`/expenses/${id}`, data)
      )
      const idx = expenses.value.findIndex((e) => e.id === id)
      if (idx !== -1) expenses.value[idx] = updated
    } catch (err) {
      error.value = extractMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteExpense(id: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await expenseApi.delete(`/expenses/${id}`)
      expenses.value = expenses.value.filter((e) => e.id !== id)
    } catch (err) {
      error.value = extractMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return { expenses, loading, error, fetchExpenses, createExpense, updateExpense, deleteExpense }
})

function extractMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { error?: { message?: string } } } }).response
    return res?.data?.error?.message ?? 'An unexpected error occurred'
  }
  return 'An unexpected error occurred'
}
