<template>
  <AppLayout>
    <!-- Header row -->
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-xl font-bold text-slate-900">
          Budgets
        </h1>
        <p class="text-sm text-slate-500">
          Set and manage your monthly budgets
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <select
          v-model="selectedMonth"
          class="input-base w-auto"
          @change="debouncedLoadBudgets"
        >
          <option
            v-for="m in months"
            :key="m.value"
            :value="m.value"
          >
            {{ m.label }}
          </option>
        </select>
        <select
          v-model="selectedYear"
          class="input-base w-auto"
          @change="debouncedLoadBudgets"
        >
          <option
            v-for="y in years"
            :key="y"
            :value="y"
          >
            {{ y }}
          </option>
        </select>
        <AppButton @click="openCreate">
          <svg
            class="w-4 h-4 mr-1.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Set Budget
        </AppButton>
      </div>
    </div>

    <!-- Error banner -->
    <ErrorBanner :message="budgetStore.error" />

    <!-- Table -->
    <AppTable
      :columns="columns"
      :rows="tableRows"
    >
      <template #cell-amount="{ value }">
        <span class="font-semibold text-indigo-700">{{ formatCurrency(value as number) }}</span>
      </template>
      <template #cell-period="{ value }">
        <span class="text-slate-600">{{ value }}</span>
      </template>
      <template #cell-category="{ value }">
        <span
          v-if="value"
          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700"
        >
          {{ value }}
        </span>
        <span
          v-else
          class="text-slate-400 text-xs"
        >General</span>
      </template>
      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-2">
          <AppButton
            variant="secondary"
            size="sm"
            @click="openEditById(row['id'] as string)"
          >
            Edit
          </AppButton>
          <AppButton
            variant="danger"
            size="sm"
            :loading="deletingId === row['id']"
            @click="handleDelete(row['id'] as string)"
          >
            Delete
          </AppButton>
        </div>
      </template>
      <template #empty>
        <div class="text-center py-12 text-slate-400">
          <svg
            class="w-14 h-14 mx-auto mb-3 opacity-40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p class="text-sm font-medium">
            No budgets set for this period
          </p>
          <p class="text-xs mt-1">
            Click "Set Budget" to create your first budget
          </p>
        </div>
      </template>
    </AppTable>

    <!-- Infinite scroll sentinel -->
    <div
      ref="scrollSentinel"
      class="h-1"
    ></div>
    <div
      v-if="budgetStore.loading && budgetStore.budgets.length > 0"
      class="text-center py-4"
    >
      <span class="text-sm text-slate-400">Loading more...</span>
    </div>
    <div
      v-if="!budgetStore.hasMore && budgetStore.budgets.length > 0"
      class="text-center py-3"
    >
      <span class="text-xs text-slate-300">All {{ budgetStore.total }} budgets loaded</span>
    </div>

    <!-- Create/Edit Modal -->
    <AppModal
      v-model="showModal"
      :title="editingBudget ? 'Edit Budget' : 'Set Budget'"
    >
      <BudgetForm
        :initial-data="editingBudget"
        :categories="categoryStore.categories"
        :loading="budgetStore.mutating"
        @submit="handleSubmit"
        @cancel="showModal = false"
      />
    </AppModal>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import AppLayout from '../layouts/AppLayout.vue'
import AppButton from '../components/common/AppButton.vue'
import AppTable, { type TableColumn } from '../components/common/AppTable.vue'
import AppModal from '../components/common/AppModal.vue'
import BudgetForm from '../components/forms/BudgetForm.vue'
import ErrorBanner from '../components/common/ErrorBanner.vue'
import { useBudgetStore } from '../stores/budget.store'
import { useCategoryStore } from '../stores/category.store'
import { useSubAccountStore } from '../stores/subaccount.store'
import type { BudgetResponse, CreateBudgetRequest } from '@financer/shared'
import { formatCurrency } from '../utils/formatting'
import { MONTHS } from '../utils/constants'

const budgetStore = useBudgetStore()
const categoryStore = useCategoryStore()
const subAccountStore = useSubAccountStore()

watch(() => subAccountStore.activeSubAccountId, () => {
  loadBudgets()
  categoryStore.fetchCategories()
})

const now = new Date()
const selectedMonth = ref(now.getMonth() + 1)
const selectedYear = ref(now.getFullYear())

const showModal = ref(false)
const editingBudget = ref<BudgetResponse | null>(null)
const deletingId = ref<string | null>(null)
const scrollSentinel = ref<HTMLElement | null>(null)

const months = MONTHS

const years = computed(() =>
  Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)
)

const columns: TableColumn[] = [
  { key: 'category', label: 'Category' },
  { key: 'period', label: 'Period' },
  { key: 'amount', label: 'Budget Amount', align: 'right' },
]

const tableRows = computed<Record<string, unknown>[]>(() =>
  budgetStore.budgets.map((b) => ({
    id: b.id,
    category: b.categoryName,
    period: `${monthName(b.month)} ${b.year}`,
    amount: b.amount,
  }))
)

function monthName(m: number): string {
  return new Date(2000, m - 1, 1).toLocaleString('en-US', { month: 'long' })
}

const fetchingInitial = ref(false)

async function loadBudgets(): Promise<void> {
  fetchingInitial.value = true
  await budgetStore.fetchBudgets(selectedMonth.value, selectedYear.value)
  fetchingInitial.value = false
}

let loadTimer: ReturnType<typeof setTimeout> | null = null

function debouncedLoadBudgets(): void {
  if (loadTimer) clearTimeout(loadTimer)
  loadTimer = setTimeout(() => loadBudgets(), 300)
}

function openCreate(): void {
  editingBudget.value = null
  showModal.value = true
}

function openEditById(id: string): void {
  const found = budgetStore.budgets.find((b) => b.id === id) ?? null
  editingBudget.value = found
  showModal.value = true
}

async function handleSubmit(data: CreateBudgetRequest): Promise<void> {
  try {
    if (editingBudget.value) {
      await budgetStore.updateBudget(editingBudget.value.id, data)
    } else {
      await budgetStore.createBudget(data)
    }
    showModal.value = false
  } catch {
    // Error already set in store
  }
}

async function handleDelete(id: string): Promise<void> {
  if (!confirm('Are you sure you want to delete this budget?')) return
  deletingId.value = id
  try {
    await budgetStore.deleteBudget(id)
  } finally {
    deletingId.value = null
  }
}

let observer: IntersectionObserver | null = null

onMounted(async () => {
  await Promise.all([loadBudgets(), categoryStore.fetchCategories()])

  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && !budgetStore.loading && budgetStore.hasMore && !fetchingInitial.value) {
        budgetStore.fetchMoreBudgets()
      }
    },
    { rootMargin: '200px' },
  )

  if (scrollSentinel.value) {
    observer.observe(scrollSentinel.value)
  }
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>
