import { defineStore } from 'pinia'
import { incomeApi } from '../services/api.service'
import { useCrudStore } from '../composables/useCrudStore'
import type {
  IncomeResponse,
  CreateIncomeRequest,
  UpdateIncomeRequest,
} from '@financer/shared'

export const useIncomeStore = defineStore('incomes', () => {
  const { items: incomes, loading, mutating, error, total, hasMore, fetchItems, fetchMore, createItem, updateItem, deleteItem } =
    useCrudStore<IncomeResponse, CreateIncomeRequest, UpdateIncomeRequest>(incomeApi, '/income')

  return {
    incomes,
    loading,
    mutating,
    error,
    total,
    hasMore,
    fetchIncomes: fetchItems,
    fetchMoreIncomes: fetchMore,
    createIncome: createItem,
    updateIncome: updateItem,
    deleteIncome: deleteItem,
  }
})
