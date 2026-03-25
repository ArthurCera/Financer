<template>
  <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
    <h3 class="text-base font-semibold text-slate-900 mb-4">Expenses by Category</h3>

    <div v-if="categories.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-400">
      <svg class="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
      <p class="text-sm">No expense data for this period</p>
    </div>

    <template v-else>
      <apexchart
        type="donut"
        height="280"
        :options="chartOptions"
        :series="series"
      />
      <!-- Legend -->
      <ul class="mt-4 space-y-2">
        <li
          v-for="(cat, idx) in categories"
          :key="cat.categoryId"
          class="flex items-center justify-between text-sm"
        >
          <div class="flex items-center gap-2">
            <span
              class="inline-block w-3 h-3 rounded-full"
              :style="{ backgroundColor: colors[idx] }"
            />
            <span class="text-slate-600">{{ cat.categoryName }}</span>
          </div>
          <span class="font-medium text-slate-800">{{ formatCurrency(cat.total) }}</span>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CategoryBreakdownResponse } from '@financer/shared'

const props = defineProps<{
  categories: CategoryBreakdownResponse[]
}>()

const DEFAULT_COLORS = [
  '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
]

const colors = computed(() =>
  props.categories.map(
    (cat, idx) => cat.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length] || '#4F46E5'
  )
)

const series = computed(() => props.categories.map((c) => c.total))

const labels = computed(() => props.categories.map((c) => c.categoryName))

const chartOptions = computed(() => ({
  chart: {
    type: 'donut',
    toolbar: { show: false },
    animations: { enabled: true, easing: 'easeinout', speed: 400 },
  },
  colors: colors.value,
  labels: labels.value,
  legend: { show: false },
  dataLabels: {
    enabled: true,
    formatter: (_val: number, opts: { seriesIndex: number; w: { globals: { series: number[] } } }) => {
      const pct = props.categories[opts.seriesIndex]?.percentage ?? 0
      return `${pct.toFixed(1)}%`
    },
  },
  plotOptions: {
    pie: {
      donut: {
        size: '65%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Total',
            fontSize: '13px',
            fontWeight: 600,
            color: '#475569',
            formatter: () =>
              formatCurrency(props.categories.reduce((sum, c) => sum + c.total, 0)),
          },
        },
      },
    },
  },
  tooltip: {
    y: {
      formatter: (val: number) => formatCurrency(val),
    },
  },
  stroke: { width: 0 },
}))

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}
</script>
