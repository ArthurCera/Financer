<template>
  <AppLayout>
    <!-- Header row -->
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Expenses</h1>
        <p class="text-sm text-slate-500">Track and manage your spending</p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <select v-model="selectedMonth" class="input-base w-auto" @change="loadExpenses">
          <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
        <select v-model="selectedYear" class="input-base w-auto" @change="loadExpenses">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
        <AppButton
          variant="secondary"
          :loading="llmStore.categorizeBatchLoading"
          @click="handleCategorizeBatch"
        >
          <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Auto-categorize
        </AppButton>
        <AppButton @click="openCreate">
          <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Expense
        </AppButton>
      </div>
    </div>

    <!-- Categorize success banner -->
    <div v-if="categorizeMsg" class="mb-4 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3">
      <p class="text-sm text-indigo-700">{{ categorizeMsg }}</p>
    </div>

    <!-- Error banner -->
    <div v-if="expenseStore.error" class="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
      <p class="text-sm text-red-700">{{ expenseStore.error }}</p>
    </div>

    <!-- Table -->
    <AppTable :columns="columns" :rows="tableRows">
      <template #cell-amount="{ value }">
        <span class="font-semibold text-red-600">{{ formatCurrency(value as number) }}</span>
      </template>
      <template #cell-date="{ value }">
        {{ formatDate(value as string) }}
      </template>
      <template #cell-category="{ value }">
        <span
          v-if="value"
          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700"
        >
          {{ value }}
        </span>
        <span v-else class="text-slate-400 text-xs">—</span>
      </template>
      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-2">
          <AppButton variant="secondary" size="sm" @click="openEditById(row['id'] as string)">
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
          <svg class="w-14 h-14 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p class="text-sm font-medium">No expenses found for this period</p>
          <p class="text-xs mt-1">Click "Add Expense" to record your first expense</p>
        </div>
      </template>
    </AppTable>

    <!-- Create/Edit Modal -->
    <AppModal v-model="showModal" :title="editingExpense ? 'Edit Expense' : 'Add Expense'">
      <ExpenseForm
        :initial-data="editingExpense"
        :loading="expenseStore.loading"
        @submit="handleSubmit"
        @cancel="showModal = false"
      />
    </AppModal>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppLayout from '../layouts/AppLayout.vue'
import AppButton from '../components/common/AppButton.vue'
import AppTable, { type TableColumn } from '../components/common/AppTable.vue'
import AppModal from '../components/common/AppModal.vue'
import ExpenseForm from '../components/forms/ExpenseForm.vue'
import { useExpenseStore } from '../stores/expense.store'
import { useLLMStore } from '../stores/llm.store'
import type { ExpenseResponse, CreateExpenseRequest } from '@financer/shared'
import { formatCurrency, formatDate } from '../utils/formatting'
import { MONTHS } from '../utils/constants'

const expenseStore = useExpenseStore()
const llmStore = useLLMStore()

const now = new Date()
const selectedMonth = ref(now.getMonth() + 1)
const selectedYear = ref(now.getFullYear())

const showModal = ref(false)
const editingExpense = ref<ExpenseResponse | null>(null)
const deletingId = ref<string | null>(null)
const categorizeMsg = ref<string | null>(null)

const months = MONTHS

const years = computed(() =>
  Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)
)

const columns: TableColumn[] = [
  { key: 'date', label: 'Date' },
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount', align: 'right' },
]

const tableRows = computed<Record<string, unknown>[]>(() =>
  expenseStore.expenses.map((e) => ({
    id: e.id,
    date: e.date,
    description: e.description ?? '—',
    category: e.categoryName,
    amount: e.amount,
  }))
)

async function loadExpenses(): Promise<void> {
  await expenseStore.fetchExpenses(selectedMonth.value, selectedYear.value)
}

function openCreate(): void {
  editingExpense.value = null
  showModal.value = true
}

function openEditById(id: string): void {
  const found = expenseStore.expenses.find((e) => e.id === id) ?? null
  editingExpense.value = found
  showModal.value = true
}

async function handleSubmit(data: CreateExpenseRequest): Promise<void> {
  try {
    if (editingExpense.value) {
      await expenseStore.updateExpense(editingExpense.value.id, data)
    } else {
      await expenseStore.createExpense(data)
    }
    showModal.value = false
  } catch {
    // Error already set in store
  }
}

async function handleDelete(id: string): Promise<void> {
  if (!confirm('Are you sure you want to delete this expense?')) return
  deletingId.value = id
  try {
    await expenseStore.deleteExpense(id)
  } finally {
    deletingId.value = null
  }
}

async function handleCategorizeBatch(): Promise<void> {
  categorizeMsg.value = null
  const success = await llmStore.categorizeBatch(selectedMonth.value, selectedYear.value)
  if (success) {
    categorizeMsg.value = 'Batch categorization queued — refresh in a moment to see results.'
    setTimeout(() => { categorizeMsg.value = null }, 8000)
  }
}

onMounted(loadExpenses)
</script>
