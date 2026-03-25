import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dashboardApi, unwrap, setActingAs } from '../services/api.service'
import { extractErrorMessage } from '../utils/errors'
import type { SubAccountResponse, CreateSubAccountRequest } from '@financer/shared'

export const useSubAccountStore = defineStore('subaccount', () => {
  const subAccounts = ref<SubAccountResponse[]>([])
  const activeSubAccountId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeSubAccount = computed(() =>
    subAccounts.value.find((s) => s.id === activeSubAccountId.value) ?? null
  )

  async function fetchSubAccounts(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      subAccounts.value = unwrap<SubAccountResponse[]>(
        await dashboardApi.get<{ data: SubAccountResponse[] }>('/admin/sub-accounts')
      )
    } catch (err) {
      error.value = extractErrorMessage(err)
    } finally {
      loading.value = false
    }
  }

  function switchToSubAccount(userId: string): void {
    activeSubAccountId.value = userId
    setActingAs(userId)
  }

  function switchToOwnAccount(): void {
    activeSubAccountId.value = null
    setActingAs(null)
  }

  async function createSubAccount(data: CreateSubAccountRequest): Promise<SubAccountResponse | null> {
    loading.value = true
    error.value = null
    try {
      const result = unwrap<SubAccountResponse>(
        await dashboardApi.post<{ data: SubAccountResponse }>('/admin/sub-accounts', data)
      )
      subAccounts.value.push(result)
      return result
    } catch (err) {
      error.value = extractErrorMessage(err)
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    subAccounts,
    activeSubAccountId,
    activeSubAccount,
    loading,
    error,
    fetchSubAccounts,
    switchToSubAccount,
    switchToOwnAccount,
    createSubAccount,
  }
})
