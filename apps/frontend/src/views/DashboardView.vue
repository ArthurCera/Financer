<template>
  <AppLayout>
    <!-- Period selector -->
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-xl font-bold text-slate-900">
          Dashboard
        </h1>
        <p class="text-sm text-slate-500">
          Your financial overview at a glance
        </p>
      </div>

      <div class="flex items-center gap-3">
        <label class="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
          <input
            v-model="showAll"
            type="checkbox"
            class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            @change="loadDashboard"
          />
          All
        </label>
        <select
          v-model="selectedMonth"
          class="input-base w-auto"
          :disabled="showAll"
          :class="{ 'opacity-50': showAll }"
          @change="loadDashboard"
        >
          <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
        <select
          v-model="selectedYear"
          class="input-base w-auto"
          :disabled="showAll"
          :class="{ 'opacity-50': showAll }"
          @change="loadDashboard"
        >
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
    </div>

    <!-- Loading state -->
    <div
      v-if="dashboardStore.loading"
      class="flex items-center justify-center py-20"
    >
      <div class="text-center">
        <svg
          class="animate-spin w-10 h-10 text-indigo-600 mx-auto mb-3"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p class="text-slate-500 text-sm">
          Loading dashboard...
        </p>
      </div>
    </div>

    <!-- Error state -->
    <div
      v-else-if="dashboardStore.error"
      class="rounded-xl bg-red-50 border border-red-200 p-6 text-center"
    >
      <p class="text-red-700 text-sm">
        {{ dashboardStore.error }}
      </p>
      <AppButton
        class="mt-3"
        size="sm"
        @click="loadDashboard"
      >
        Retry
      </AppButton>
    </div>

    <template v-else-if="dashboardStore.dashboard">
      <!-- Summary cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <SummaryCard
          title="Total Expenses"
          :value="dashboardStore.dashboard.totalExpenses"
          subtitle="This period"
          color-class="red"
        >
          <template #icon>
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            /></svg>
          </template>
        </SummaryCard>
        <SummaryCard
          title="Total Income"
          :value="dashboardStore.dashboard.totalIncome"
          subtitle="This period"
          color-class="emerald"
        >
          <template #icon>
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            /></svg>
          </template>
        </SummaryCard>
        <SummaryCard
          title="Total Budget"
          :value="dashboardStore.dashboard.totalBudget"
          subtitle="Budget set"
          color-class="indigo"
        >
          <template #icon>
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            /></svg>
          </template>
        </SummaryCard>
        <SummaryCard
          title="Net Savings"
          :value="savings"
          subtitle="This period"
          :color-class="savings >= 0 ? 'emerald' : 'red'"
        >
          <template #icon>
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            /></svg>
          </template>
        </SummaryCard>
        <SummaryCard
          title="All-Time Savings"
          :value="dashboardStore.dashboard.allTimeNetSavings ?? 0"
          subtitle="Total across all months"
          :color-class="(dashboardStore.dashboard.allTimeNetSavings ?? 0) >= 0 ? 'emerald' : 'red'"
        >
          <template #icon>
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
            /></svg>
          </template>
        </SummaryCard>
      </div>

      <!-- Charts row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ExpenseChart :categories="dashboardStore.dashboard.expensesByCategory" />

        <!-- LLM Stats Card -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 class="text-base font-semibold text-slate-900 mb-4">
            AI Assistant Usage
          </h3>
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center">
              <p class="text-2xl font-bold text-indigo-600">
                {{ dashboardStore.dashboard.llmStats.chatMessageCount }}
              </p>
              <p class="text-xs text-slate-500 mt-1">
                Chat Messages
              </p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-emerald-600">
                {{ dashboardStore.dashboard.llmStats.categorizationsCount }}
              </p>
              <p class="text-xs text-slate-500 mt-1">
                Categorizations
              </p>
            </div>
            <div class="text-center">
              <p class="text-sm font-medium text-slate-700">
                {{ dashboardStore.dashboard.llmStats.lastChatAt ? formatDate(dashboardStore.dashboard.llmStats.lastChatAt) : 'Never' }}
              </p>
              <p class="text-xs text-slate-500 mt-1">
                Last Chat
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Expenses Table -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 class="text-base font-semibold text-slate-900">
            Recent Expenses
          </h3>
          <router-link
            to="/expenses"
            class="text-sm text-indigo-600 hover:text-indigo-800"
          >
            View all
          </router-link>
        </div>
        <div
          v-if="dashboardStore.dashboard.recentExpenses.length === 0"
          class="py-8 text-center text-slate-400 text-sm"
        >
          No expenses this period
        </div>
        <table
          v-else
          class="w-full text-sm"
        >
          <thead>
            <tr class="border-b border-slate-200 text-left">
              <th
                class="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700"
                @click="toggleSort('date')"
              >
                Date {{ sortIcon('date') }}
              </th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                Description
              </th>
              <th class="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                Category
              </th>
              <th
                class="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right cursor-pointer hover:text-slate-700"
                @click="toggleSort('amount')"
              >
                Amount {{ sortIcon('amount') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="exp in sortedExpenses"
              :key="exp.id"
              class="border-b border-slate-100 hover:bg-slate-50"
            >
              <td class="px-6 py-3 text-slate-600">
                {{ formatDate(exp.date) }}
              </td>
              <td class="px-6 py-3 text-slate-900">
                {{ exp.description || '\u2014' }}
              </td>
              <td class="px-6 py-3">
                <span
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                  :style="{
                    backgroundColor: (exp.categoryColor ?? '#9CA3AF') + '18',
                    color: exp.categoryColor ?? '#9CA3AF',
                  }"
                >
                  <CategoryIcon :icon="exp.categoryIcon ?? 'tag'" />
                  {{ exp.categoryName ?? 'Uncategorized' }}
                </span>
              </td>
              <td class="px-6 py-3 text-right font-semibold text-red-600">
                {{ formatCurrency(exp.amount) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Empty state -->
    <div
      v-else
      class="text-center py-16 text-slate-400"
    >
      <p class="text-sm">
        No data available for this period.
      </p>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import AppLayout from '../layouts/AppLayout.vue'
import AppButton from '../components/common/AppButton.vue'
import SummaryCard from '../components/dashboard/SummaryCard.vue'
import ExpenseChart from '../components/dashboard/ExpenseChart.vue'
import CategoryIcon from '../components/common/CategoryIcon.vue'
import { useDashboardStore } from '../stores/dashboard.store'
import { useSubAccountStore } from '../stores/subaccount.store'
import { MONTHS } from '../utils/constants'
import { formatCurrency, formatDate } from '../utils/formatting'

const dashboardStore = useDashboardStore()
const subAccountStore = useSubAccountStore()

watch(() => subAccountStore.activeSubAccountId, () => {
  loadDashboard()
})

const now = new Date()
const selectedMonth = ref(now.getMonth() + 1)
const selectedYear = ref(now.getFullYear())
const showAll = ref(false)

const months = MONTHS

const years = computed(() => {
  const currentYear = now.getFullYear()
  return Array.from({ length: 5 }, (_, i) => currentYear - i)
})

const savings = computed(() => {
  if (!dashboardStore.dashboard) return 0
  return dashboardStore.dashboard.totalIncome - dashboardStore.dashboard.totalExpenses
})

async function loadDashboard(): Promise<void> {
  if (showAll.value) {
    await dashboardStore.fetchDashboard()
  } else {
    await dashboardStore.fetchDashboard(selectedMonth.value, selectedYear.value)
  }
}

type SortField = 'date' | 'amount'
type SortDir = 'asc' | 'desc'

const sortField = ref<SortField>('date')
const sortDir = ref<SortDir>('desc')

function toggleSort(field: SortField): void {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'desc'
  }
}

function sortIcon(field: SortField): string {
  if (sortField.value !== field) return ''
  return sortDir.value === 'asc' ? '\u2191' : '\u2193'
}

const sortedExpenses = computed(() => {
  if (!dashboardStore.dashboard?.recentExpenses) return []
  const items = [...dashboardStore.dashboard.recentExpenses]
  items.sort((a, b) => {
    const cmp = sortField.value === 'date'
      ? a.date.localeCompare(b.date)
      : a.amount - b.amount
    return sortDir.value === 'asc' ? cmp : -cmp
  })
  return items
})

onMounted(loadDashboard)
</script>
