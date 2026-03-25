import { ref, computed } from 'vue'
import type { AxiosInstance } from 'axios'
import { unwrapPaginated, type PaginationMeta } from '../services/api.service'
import { extractErrorMessage } from '../utils/errors'

const DEFAULT_PAGE_SIZE = 20

/**
 * Generic CRUD composable for Pinia stores with infinite scroll pagination.
 *
 * Encapsulates the repeated fetch / create / update / delete pattern
 * used by expense, budget, and income stores.
 *
 * @param api       - Axios instance for the target microservice
 * @param basePath  - REST base path (e.g. '/expenses', '/budgets', '/income')
 * @param pageSize  - Items per page (default 20)
 */
export function useCrudStore<
  TResponse extends { id: string },
  TCreate = unknown,
  TUpdate = unknown,
>(api: AxiosInstance, basePath: string, pageSize: number = DEFAULT_PAGE_SIZE) {
  const items = ref<TResponse[]>([])
  const loading = ref(false)
  const mutating = ref(false)
  const error = ref<string | null>(null)
  const total = ref(0)

  // Dedicated flag to prevent duplicate fetchMore calls from IntersectionObserver
  const fetchingMore = ref(false)

  // Track current filter params so fetchMore can reuse them
  const currentParams = ref<Record<string, number>>({})

  const hasMore = computed(() => items.value.length < total.value)

  async function fetchItems(month?: number, year?: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const params: Record<string, number> = { limit: pageSize, offset: 0 }
      if (month !== undefined) params['month'] = month
      if (year !== undefined) params['year'] = year
      currentParams.value = params

      const result = unwrapPaginated<TResponse>(
        await api.get<{ data: TResponse[]; pagination: PaginationMeta }>(basePath, { params }),
      )
      items.value = result.items
      total.value = result.pagination.total
    } catch (err) {
      error.value = extractErrorMessage(err)
    } finally {
      loading.value = false
    }
  }

  async function fetchMore(): Promise<void> {
    if (!hasMore.value || loading.value || fetchingMore.value) return
    fetchingMore.value = true
    loading.value = true
    error.value = null
    try {
      const params = { ...currentParams.value, offset: items.value.length }
      const result = unwrapPaginated<TResponse>(
        await api.get<{ data: TResponse[]; pagination: PaginationMeta }>(basePath, { params }),
      )
      items.value.push(...result.items)
      total.value = result.pagination.total
    } catch (err) {
      error.value = extractErrorMessage(err)
    } finally {
      fetchingMore.value = false
      loading.value = false
    }
  }

  async function createItem(data: TCreate): Promise<void> {
    mutating.value = true
    error.value = null
    try {
      const response = await api.post<{ data: TResponse }>(basePath, data)
      const created = response.data.data
      items.value.unshift(created)
      total.value += 1
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      mutating.value = false
    }
  }

  async function updateItem(id: string, data: TUpdate): Promise<void> {
    mutating.value = true
    error.value = null
    try {
      const response = await api.put<{ data: TResponse }>(`${basePath}/${id}`, data)
      const updated = response.data.data
      const idx = items.value.findIndex((item) => item.id === id)
      if (idx !== -1) items.value[idx] = updated
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      mutating.value = false
    }
  }

  async function deleteItem(id: string): Promise<void> {
    mutating.value = true
    error.value = null
    try {
      await api.delete(`${basePath}/${id}`)
      items.value = items.value.filter((item) => item.id !== id)
      total.value = Math.max(0, total.value - 1)
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      mutating.value = false
    }
  }

  return { items, loading, mutating, error, total, hasMore, fetchItems, fetchMore, createItem, updateItem, deleteItem }
}
