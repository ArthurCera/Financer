import { defineStore } from 'pinia'
import { ref } from 'vue'
import { expenseApi, unwrap } from '../services/api.service'
import { extractErrorMessage } from '../utils/errors'
import type { CategoryResponse, CreateCategoryRequest, UpdateCategoryRequest } from '@financer/shared'

export const useCategoryStore = defineStore('category', () => {
  const categories = ref<CategoryResponse[]>([])
  const loading = ref(false)
  const mutating = ref(false)
  const error = ref<string | null>(null)

  async function fetchCategories(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = unwrap<CategoryResponse[]>(
        await expenseApi.get<{ data: CategoryResponse[] }>('/categories'),
      )
      categories.value = result
    } catch (err) {
      error.value = extractErrorMessage(err)
    } finally {
      loading.value = false
    }
  }

  async function createCategory(data: CreateCategoryRequest): Promise<void> {
    mutating.value = true
    error.value = null
    try {
      const result = unwrap<CategoryResponse>(
        await expenseApi.post<{ data: CategoryResponse }>('/categories', data),
      )
      categories.value.push(result)
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      mutating.value = false
    }
  }

  async function updateCategory(id: string, data: UpdateCategoryRequest): Promise<void> {
    mutating.value = true
    error.value = null
    try {
      const result = unwrap<CategoryResponse>(
        await expenseApi.put<{ data: CategoryResponse }>(`/categories/${id}`, data),
      )
      const idx = categories.value.findIndex((c: CategoryResponse) => c.id === id)
      if (idx !== -1) categories.value[idx] = result
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      mutating.value = false
    }
  }

  async function deleteCategory(id: string): Promise<void> {
    mutating.value = true
    error.value = null
    try {
      await expenseApi.delete(`/categories/${id}`)
      categories.value = categories.value.filter((c: CategoryResponse) => c.id !== id)
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      mutating.value = false
    }
  }

  return { categories, loading, mutating, error, fetchCategories, createCategory, updateCategory, deleteCategory }
})
