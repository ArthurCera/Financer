<template>
  <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
    <div class="flex items-center justify-between mb-4">
      <p class="text-sm font-medium text-slate-500">
        {{ title }}
      </p>
      <div
        class="w-10 h-10 rounded-lg flex items-center justify-center text-white"
        :class="iconBgClass"
      >
        <slot name="icon"></slot>
      </div>
    </div>
    <p
      class="text-2xl font-bold"
      :class="valueColorClass"
    >
      {{ formattedValue }}
    </p>
    <p
      v-if="subtitle"
      class="mt-1 text-xs text-slate-400"
    >
      {{ subtitle }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    value: number
    subtitle?: string
    colorClass?: 'indigo' | 'emerald' | 'red' | 'amber'
  }>(),
  {
    colorClass: 'indigo',
  }
)

const iconBgClass = computed(() => {
  switch (props.colorClass) {
    case 'emerald':
      return 'bg-emerald-500'
    case 'red':
      return 'bg-red-500'
    case 'amber':
      return 'bg-amber-500'
    default:
      return 'bg-indigo-600'
  }
})

const valueColorClass = computed(() => {
  switch (props.colorClass) {
    case 'emerald':
      return 'text-emerald-600'
    case 'red':
      return 'text-red-600'
    case 'amber':
      return 'text-amber-600'
    default:
      return 'text-slate-900'
  }
})

const formattedValue = computed(() =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(props.value)
)
</script>
