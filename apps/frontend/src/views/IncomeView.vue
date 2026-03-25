<template>
  <AppLayout>
    <!-- Header row -->
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-xl font-bold text-slate-900">
          Income
        </h1>
        <p class="text-sm text-slate-500">
          Track all your income sources
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <select
          v-model="selectedMonth"
          class="input-base w-auto"
          @change="debouncedLoadIncomes"
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
          @change="debouncedLoadIncomes"
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
          Add Income
        </AppButton>
      </div>
    </div>

    <!-- Total income card -->
    <div class="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl px-6 py-4 flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-emerald-700">
          Total Income this period
        </p>
        <p class="text-2xl font-bold text-emerald-700 mt-0.5">
          {{ formatCurrency(totalIncome) }}
        </p>
      </div>
      <div class="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
        <svg
          class="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
    </div>

    <!-- Error banner -->
    <ErrorBanner :message="incomeStore.error" />

    <!-- Table -->
    <AppTable
      :columns="columns"
      :rows="tableRows"
    >
      <template #cell-amount="{ value }">
        <span class="font-semibold text-emerald-600">{{ formatCurrency(value as number) }}</span>
      </template>
      <template #cell-date="{ value }">
        {{ formatDate(value as string) }}
      </template>
      <template #cell-source="{ value }">
        <span
          v-if="value"
          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"
        >
          {{ value }}
        </span>
        <span
          v-else
          class="text-slate-400 text-xs"
        >—</span>
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
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p class="text-sm font-medium">
            No income records for this period
          </p>
          <p class="text-xs mt-1">
            Click "Add Income" to record your first income
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
      v-if="incomeStore.loading && incomeStore.incomes.length > 0"
      class="text-center py-4"
    >
      <span class="text-sm text-slate-400">Loading more...</span>
    </div>
    <div
      v-if="!incomeStore.hasMore && incomeStore.incomes.length > 0"
      class="text-center py-3"
    >
      <span class="text-xs text-slate-300">All {{ incomeStore.total }} records loaded</span>
    </div>

    <!-- Create/Edit Modal -->
    <AppModal
      v-model="showModal"
      :title="editingIncome ? 'Edit Income' : 'Add Income'"
    >
      <IncomeForm
        :initial-data="editingIncome"
        :loading="incomeStore.mutating"
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
import IncomeForm from '../components/forms/IncomeForm.vue'
import ErrorBanner from '../components/common/ErrorBanner.vue'
import { useIncomeStore } from '../stores/income.store'
import { useSubAccountStore } from '../stores/subaccount.store'
import type { IncomeResponse, CreateIncomeRequest } from '@financer/shared'
import { formatCurrency, formatDate } from '../utils/formatting'
import { MONTHS } from '../utils/constants'

const incomeStore = useIncomeStore()
const subAccountStore = useSubAccountStore()

watch(() => subAccountStore.activeSubAccountId, () => {
  loadIncomes()
})

const now = new Date()
const selectedMonth = ref(now.getMonth() + 1)
const selectedYear = ref(now.getFullYear())

const showModal = ref(false)
const editingIncome = ref<IncomeResponse | null>(null)
const deletingId = ref<string | null>(null)
const scrollSentinel = ref<HTMLElement | null>(null)

const months = MONTHS

const years = computed(() =>
  Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)
)

const columns: TableColumn[] = [
  { key: 'date', label: 'Date' },
  { key: 'source', label: 'Source' },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount', align: 'right' },
]

const tableRows = computed<Record<string, unknown>[]>(() =>
  incomeStore.incomes.map((inc) => ({
    id: inc.id,
    date: inc.date,
    source: inc.source,
    description: inc.description ?? '—',
    amount: inc.amount,
  }))
)

const totalIncome = computed(() =>
  incomeStore.incomes.reduce((sum, inc) => sum + inc.amount, 0)
)

const fetchingInitial = ref(false)

async function loadIncomes(): Promise<void> {
  fetchingInitial.value = true
  await incomeStore.fetchIncomes(selectedMonth.value, selectedYear.value)
  fetchingInitial.value = false
}

let loadTimer: ReturnType<typeof setTimeout> | null = null

function debouncedLoadIncomes(): void {
  if (loadTimer) clearTimeout(loadTimer)
  loadTimer = setTimeout(() => loadIncomes(), 300)
}

function openCreate(): void {
  editingIncome.value = null
  showModal.value = true
}

function openEditById(id: string): void {
  const found = incomeStore.incomes.find((inc) => inc.id === id) ?? null
  editingIncome.value = found
  showModal.value = true
}

async function handleSubmit(data: CreateIncomeRequest): Promise<void> {
  try {
    if (editingIncome.value) {
      await incomeStore.updateIncome(editingIncome.value.id, data)
    } else {
      await incomeStore.createIncome(data)
    }
    showModal.value = false
  } catch {
    // Error already set in store
  }
}

async function handleDelete(id: string): Promise<void> {
  if (!confirm('Are you sure you want to delete this income record?')) return
  deletingId.value = id
  try {
    await incomeStore.deleteIncome(id)
  } finally {
    deletingId.value = null
  }
}

let observer: IntersectionObserver | null = null

onMounted(async () => {
  await loadIncomes()

  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && !incomeStore.loading && incomeStore.hasMore && !fetchingInitial.value) {
        incomeStore.fetchMoreIncomes()
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
