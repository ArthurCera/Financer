import { defineStore } from 'pinia'
import { budgetApi } from '../services/api.service'
import { useCrudStore } from '../composables/useCrudStore'
import type {
  BudgetResponse,
  CreateBudgetRequest,
  UpdateBudgetRequest,
} from '@financer/shared'

export const useBudgetStore = defineStore('budgets', () => {
  const { items: budgets, loading, mutating, error, total, hasMore, fetchItems, fetchMore, createItem, updateItem, deleteItem } =
    useCrudStore<BudgetResponse, CreateBudgetRequest, UpdateBudgetRequest>(budgetApi, '/budgets')

  return {
    budgets,
    loading,
    mutating,
    error,
    total,
    hasMore,
    fetchBudgets: fetchItems,
    fetchMoreBudgets: fetchMore,
    createBudget: createItem,
    updateBudget: updateItem,
    deleteBudget: deleteItem,
  }
})
