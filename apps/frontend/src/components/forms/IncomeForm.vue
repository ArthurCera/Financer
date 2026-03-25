<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <AppInput
      v-model="form.amount"
      label="Amount"
      type="number"
      placeholder="0.00"
      :min="0.01"
      :step="0.01"
      required
      :error="errors.amount"
    />

    <AppInput
      v-model="form.date"
      label="Date"
      type="date"
      required
      :error="errors.date"
    />

    <AppInput
      v-model="form.source"
      label="Source"
      placeholder="e.g. Salary, Freelance, Dividends"
      :error="errors.source"
    />

    <AppInput
      v-model="form.description"
      label="Description"
      placeholder="Optional notes about this income"
    />

    <div class="flex gap-3 pt-2">
      <AppButton type="submit" :loading="loading" class="flex-1">
        {{ initialData ? 'Update Income' : 'Add Income' }}
      </AppButton>
      <AppButton variant="secondary" type="button" @click="$emit('cancel')">
        Cancel
      </AppButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import AppInput from '../common/AppInput.vue'
import AppButton from '../common/AppButton.vue'
import type { CreateIncomeRequest, IncomeResponse } from '@financer/shared'

const props = withDefaults(
  defineProps<{
    initialData?: IncomeResponse | null
    loading?: boolean
  }>(),
  {
    initialData: null,
    loading: false,
  }
)

const emit = defineEmits<{
  (e: 'submit', data: CreateIncomeRequest): void
  (e: 'cancel'): void
}>()

const form = reactive({
  amount: props.initialData ? String(props.initialData.amount) : '',
  date: props.initialData?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  source: props.initialData?.source ?? '',
  description: props.initialData?.description ?? '',
})

const errors = reactive<Record<string, string>>({})

watch(
  () => props.initialData,
  (data) => {
    if (data) {
      form.amount = String(data.amount)
      form.date = data.date.slice(0, 10)
      form.source = data.source ?? ''
      form.description = data.description ?? ''
    }
  }
)

function validate(): boolean {
  const newErrors: Record<string, string> = {}
  if (!form.amount || Number(form.amount) <= 0) newErrors['amount'] = 'Amount must be greater than 0'
  if (!form.date) newErrors['date'] = 'Date is required'
  Object.assign(errors, newErrors)
  return Object.keys(newErrors).length === 0
}

function handleSubmit(): void {
  if (!validate()) return
  const data: CreateIncomeRequest = {
    amount: Number(form.amount),
    date: form.date,
    source: form.source || undefined,
    description: form.description || undefined,
  }
  emit('submit', data)
}
</script>
