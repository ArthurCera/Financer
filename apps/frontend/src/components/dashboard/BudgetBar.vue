<template>
  <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
    <h3 class="text-base font-semibold text-slate-900 mb-4">
      Budget vs Actual
    </h3>

    <div
      v-if="items.length === 0"
      class="flex flex-col items-center justify-center py-10 text-slate-400"
    >
      <svg
        class="w-12 h-12 mb-3 opacity-50"
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
      <p class="text-sm">
        No budgets set for this period
      </p>
    </div>

    <ul
      v-else
      class="space-y-5"
    >
      <li
        v-for="item in items"
        :key="item.categoryId ?? item.categoryName"
      >
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-sm font-medium text-slate-700">{{ item.categoryName }}</span>
          <span class="text-xs text-slate-500">
            {{ formatCurrency(item.spent) }} / {{ formatCurrency(item.budgeted) }}
          </span>
        </div>

        <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            class="h-2 rounded-full transition-all duration-500"
            :class="barColorClass(item.percentage)"
            :style="{ width: `${Math.min(item.percentage, 100)}%` }"
          ></div>
        </div>

        <div class="flex items-center justify-between mt-1">
          <span
            class="text-xs font-medium"
            :class="item.percentage >= 100 ? 'text-red-600' : item.percentage >= 80 ? 'text-amber-600' : 'text-slate-500'"
          >
            {{ item.percentage.toFixed(1) }}% used
          </span>
          <span
            class="text-xs"
            :class="item.remaining >= 0 ? 'text-emerald-600' : 'text-red-600'"
          >
            {{ item.remaining >= 0 ? 'Remaining:' : 'Over by:' }}
            {{ formatCurrency(Math.abs(item.remaining)) }}
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { BudgetComparisonResponse } from '@financer/shared'

defineProps<{
  items: BudgetComparisonResponse[]
}>()

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

function barColorClass(percentage: number): string {
  if (percentage >= 100) return 'bg-red-500'
  if (percentage >= 80) return 'bg-amber-500'
  return 'bg-emerald-500'
}
</script>
