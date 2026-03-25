<template>
  <form
    class="space-y-4"
    @submit.prevent="handleSubmit"
  >
    <AppInput
      v-model="form.amount"
      label="Budget Amount"
      type="number"
      placeholder="0.00"
      :min="0.01"
      :step="0.01"
      required
      :error="errors.amount"
    />

    <div class="grid grid-cols-2 gap-3">
      <div class="w-full">
        <label class="block text-sm font-medium text-slate-700 mb-1">Month <span class="text-red-500">*</span></label>
        <select
          v-model="form.month"
          class="input-base"
          required
        >
          <option
            v-for="m in months"
            :key="m.value"
            :value="m.value"
          >
            {{ m.label }}
          </option>
        </select>
        <p
          v-if="errors.month"
          class="mt-1 text-xs text-red-600"
        >
          {{ errors.month }}
        </p>
      </div>

      <AppInput
        v-model="form.year"
        label="Year"
        type="number"
        :min="2000"
        :max="2100"
        required
        :error="errors.year"
      />
    </div>

    <div class="w-full">
      <label class="block text-sm font-medium text-slate-700 mb-1">Category</label>
      <select
        v-model="form.categoryId"
        class="input-base"
      >
        <option value="">
          No category (general)
        </option>
        <option
          v-for="cat in categories"
          :key="cat.id"
          :value="cat.id"
        >
          {{ cat.name }}
        </option>
      </select>
    </div>

    <div class="flex gap-3 pt-2">
      <AppButton
        type="submit"
        :loading="loading"
        class="flex-1"
      >
        {{ initialData ? 'Update Budget' : 'Set Budget' }}
      </AppButton>
      <AppButton
        variant="secondary"
        type="button"
        @click="$emit('cancel')"
      >
        Cancel
      </AppButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import AppInput from '../common/AppInput.vue'
import AppButton from '../common/AppButton.vue'
import { useForm } from '../../composables/useForm'
import type { CreateBudgetRequest, BudgetResponse } from '@financer/shared'

interface CategoryOption {
  id: string
  name: string
}

const props = withDefaults(
  defineProps<{
    initialData?: BudgetResponse | null
    categories?: CategoryOption[]
    loading?: boolean
  }>(),
  {
    initialData: null,
    categories: () => [],
    loading: false,
  }
)

const emit = defineEmits<{
  (e: 'submit', data: CreateBudgetRequest): void
  (e: 'cancel'): void
}>()

const now = new Date()

function budgetValidator(data: Record<string, unknown>): Record<string, string> | null {
  const errs: Record<string, string> = {}
  if (!data.amount || Number(data.amount) <= 0) errs['amount'] = 'Amount must be greater than 0'
  if (!data.month) errs['month'] = 'Month is required'
  if (!data.year || Number(data.year) < 2000) errs['year'] = 'Valid year required'
  return Object.keys(errs).length > 0 ? errs : null
}

const { form, errors, validate } = useForm(
  {
    amount: props.initialData ? String(props.initialData.amount) : '',
    month: props.initialData?.month ?? now.getMonth() + 1,
    year: props.initialData ? String(props.initialData.year) : String(now.getFullYear()),
    categoryId: props.initialData?.categoryId ?? '',
  },
  budgetValidator,
)

const months = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
]

watch(
  () => props.initialData,
  (data) => {
    if (data) {
      form.amount = String(data.amount)
      form.month = data.month
      form.year = String(data.year)
      form.categoryId = data.categoryId ?? ''
    }
  }
)

function handleSubmit(): void {
  if (!validate()) return
  const data: CreateBudgetRequest = {
    amount: Number(form.amount),
    month: Number(form.month),
    year: Number(form.year),
    categoryId: form.categoryId || undefined,
  }
  emit('submit', data)
}
</script>
