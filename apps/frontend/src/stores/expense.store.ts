import { defineStore } from 'pinia'
import { expenseApi } from '../services/api.service'
import { useCrudStore } from '../composables/useCrudStore'
import type {
  ExpenseResponse,
  CreateExpenseRequest,
  UpdateExpenseRequest,
} from '@financer/shared'

export const useExpenseStore = defineStore('expenses', () => {
  const { items: expenses, loading, mutating, error, total, hasMore, fetchItems, fetchMore, createItem, updateItem, deleteItem } =
    useCrudStore<ExpenseResponse, CreateExpenseRequest, UpdateExpenseRequest>(expenseApi, '/expenses')

  return {
    expenses,
    loading,
    mutating,
    error,
    total,
    hasMore,
    fetchExpenses: fetchItems,
    fetchMoreExpenses: fetchMore,
    createExpense: createItem,
    updateExpense: updateItem,
    deleteExpense: deleteItem,
  }
})
