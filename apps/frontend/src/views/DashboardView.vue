<template>
  <AppLayout>
    <!-- Period selector -->
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-xl font-bold text-slate-900">Dashboard</h1>
        <p class="text-sm text-slate-500">Your financial overview at a glance</p>
      </div>

      <div class="flex items-center gap-3">
        <div class="w-full">
          <select v-model="selectedMonth" class="input-base w-auto" @change="loadDashboard">
            <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <div class="w-full">
          <select v-model="selectedYear" class="input-base w-auto" @change="loadDashboard">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="dashboardStore.loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <svg class="animate-spin w-10 h-10 text-indigo-600 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
        <p class="text-slate-500 text-sm">Loading dashboard...</p>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="dashboardStore.error" class="rounded-xl bg-red-50 border border-red-200 p-6 text-center">
      <p class="text-red-700 text-sm">{{ dashboardStore.error }}</p>
      <AppButton class="mt-3" size="sm" @click="loadDashboard">Retry</AppButton>
    </div>

    <template v-else-if="dashboardStore.dashboard">
      <!-- Summary cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Total Expenses"
          :value="dashboardStore.dashboard.totalExpenses"
          subtitle="This period"
          colorClass="red"
          :icon="expenseIcon"
        />
        <SummaryCard
          title="Total Income"
          :value="dashboardStore.dashboard.totalIncome"
          subtitle="This period"
          colorClass="emerald"
          :icon="incomeIcon"
        />
        <SummaryCard
          title="Total Budget"
          :value="dashboardStore.dashboard.totalBudget"
          subtitle="Budget set"
          colorClass="indigo"
          :icon="budgetIcon"
        />
        <SummaryCard
          title="Net Savings"
          :value="savings"
          subtitle="Income minus expenses"
          :colorClass="savings >= 0 ? 'emerald' : 'red'"
          :icon="savingsIcon"
        />
      </div>

      <!-- Charts row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpenseChart :categories="dashboardStore.dashboard.expensesByCategory" />
        <BudgetBar :items="dashboardStore.dashboard.budgetVsActual" />
      </div>
    </template>

    <!-- Empty state -->
    <div v-else class="text-center py-16 text-slate-400">
      <p class="text-sm">No data available for this period.</p>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppLayout from '../layouts/AppLayout.vue'
import AppButton from '../components/common/AppButton.vue'
import SummaryCard from '../components/dashboard/SummaryCard.vue'
import ExpenseChart from '../components/dashboard/ExpenseChart.vue'
import BudgetBar from '../components/dashboard/BudgetBar.vue'
import { useDashboardStore } from '../stores/dashboard.store'
import { MONTHS } from '../utils/constants'

const dashboardStore = useDashboardStore()

const now = new Date()
const selectedMonth = ref(now.getMonth() + 1)
const selectedYear = ref(now.getFullYear())

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
  await dashboardStore.fetchDashboard(selectedMonth.value, selectedYear.value)
}

// Icon strings
const expenseIcon = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>'
const incomeIcon = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
const budgetIcon = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>'
const savingsIcon = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>'

onMounted(loadDashboard)
</script>
