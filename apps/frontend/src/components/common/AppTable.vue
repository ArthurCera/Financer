<template>
  <div class="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              scope="col"
              class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
              :class="col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'"
            >
              {{ col.label }}
            </th>
            <th
              v-if="hasActions"
              scope="col"
              class="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <template v-if="rows.length > 0">
            <tr
              v-for="(row, idx) in rows"
              :key="idx"
              class="hover:bg-slate-50 transition-colors duration-100"
            >
              <td
                v-for="col in columns"
                :key="col.key"
                class="px-4 py-3 text-sm text-slate-700 whitespace-nowrap"
                :class="col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''"
              >
                <slot
                  :name="`cell-${col.key}`"
                  :row="row"
                  :value="row[col.key]"
                >
                  {{ row[col.key] }}
                </slot>
              </td>
              <td
                v-if="hasActions"
                class="px-4 py-3 text-right whitespace-nowrap"
              >
                <slot
                  name="actions"
                  :row="row"
                ></slot>
              </td>
            </tr>
          </template>
          <tr v-else>
            <td
              :colspan="columns.length + (hasActions ? 1 : 0)"
              class="px-4 py-12 text-center"
            >
              <slot name="empty">
                <div class="text-slate-400">
                  <svg
                    class="w-12 h-12 mx-auto mb-3 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p class="text-sm font-medium">
                    No records found
                  </p>
                </div>
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'

export interface TableColumn {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
}

defineProps<{
  columns: TableColumn[]
  rows: Record<string, unknown>[]
}>()

const slots = useSlots()
const hasActions = computed(() => !!slots['actions'])
</script>
