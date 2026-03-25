import { defineStore } from 'pinia'
import { ref } from 'vue'
import { incomeApi, unwrap } from '../services/api.service'
import type {
  IncomeResponse,
  CreateIncomeRequest,
  UpdateIncomeRequest,
} from '@financer/shared'

export const useIncomeStore = defineStore('incomes', () => {
  const incomes = ref<IncomeResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchIncomes(month?: number, year?: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const params: Record<string, number> = {}
      if (month !== undefined) params['month'] = month
      if (year !== undefined) params['year'] = year
      incomes.value = unwrap<IncomeResponse[]>(
        await incomeApi.get<{ data: IncomeResponse[] }>('/incomes', { params })
      )
    } catch (err) {
      error.value = extractMessage(err)
    } finally {
      loading.value = false
    }
  }

  async function createIncome(data: CreateIncomeRequest): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const created = unwrap<IncomeResponse>(
        await incomeApi.post<{ data: IncomeResponse }>('/incomes', data)
      )
      incomes.value.unshift(created)
    } catch (err) {
      error.value = extractMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateIncome(id: string, data: UpdateIncomeRequest): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const updated = unwrap<IncomeResponse>(
        await incomeApi.patch<{ data: IncomeResponse }>(`/incomes/${id}`, data)
      )
      const idx = incomes.value.findIndex((i) => i.id === id)
      if (idx !== -1) incomes.value[idx] = updated
    } catch (err) {
      error.value = extractMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteIncome(id: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await incomeApi.delete(`/incomes/${id}`)
      incomes.value = incomes.value.filter((i) => i.id !== id)
    } catch (err) {
      error.value = extractMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return { incomes, loading, error, fetchIncomes, createIncome, updateIncome, deleteIncome }
})

function extractMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { error?: { message?: string } } } }).response
    return res?.data?.error?.message ?? 'An unexpected error occurred'
  }
  return 'An unexpected error occurred'
}
