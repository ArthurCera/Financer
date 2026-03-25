<template>
  <form
    class="space-y-4"
    @submit.prevent="handleSubmit"
  >
    <!-- OCR Upload -->
    <div class="w-full">
      <label class="block text-sm font-medium text-slate-700 mb-1">Scan Receipt (optional)</label>
      <div class="flex items-center gap-3">
        <label
          class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors"
          :class="{ 'opacity-50 pointer-events-none': ocrLoading }"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {{ ocrLoading ? 'Scanning...' : 'Upload Image' }}
          <input
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleImageUpload"
          />
        </label>
        <span
          v-if="ocrLoading"
          class="text-xs text-slate-500"
        >Extracting data from image...</span>
        <span
          v-if="ocrSuccess"
          class="text-xs text-green-600"
        >Fields pre-filled from receipt</span>
      </div>
    </div>

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
      v-model="form.description"
      label="Description"
      placeholder="What was this expense for?"
      :error="errors.description"
    />

    <div class="w-full">
      <label class="block text-sm font-medium text-slate-700 mb-1">Category</label>
      <select
        v-model="form.categoryId"
        class="input-base"
      >
        <option value="">
          No category
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
        {{ initialData ? 'Update Expense' : 'Add Expense' }}
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
import { ref, watch } from 'vue'
import AppInput from '../common/AppInput.vue'
import AppButton from '../common/AppButton.vue'
import { useForm } from '../../composables/useForm'
import { useLLMStore } from '../../stores/llm.store'
import type { CreateExpenseRequest, ExpenseResponse } from '@financer/shared'

const llmStore = useLLMStore()
const ocrLoading = ref(false)
const ocrSuccess = ref(false)

interface CategoryOption {
  id: string
  name: string
}

const props = withDefaults(
  defineProps<{
    initialData?: ExpenseResponse | null
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
  (e: 'submit', data: CreateExpenseRequest): void
  (e: 'cancel'): void
}>()

function expenseValidator(data: Record<string, unknown>): Record<string, string> | null {
  const errs: Record<string, string> = {}
  if (!data.amount || Number(data.amount) <= 0) errs['amount'] = 'Amount must be greater than 0'
  if (!data.date) errs['date'] = 'Date is required'
  return Object.keys(errs).length > 0 ? errs : null
}

const { form, errors, validate } = useForm(
  {
    amount: props.initialData ? String(props.initialData.amount) : '',
    date: props.initialData?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    description: props.initialData?.description ?? '',
    categoryId: props.initialData?.categoryId ?? '',
  },
  expenseValidator,
)

watch(
  () => props.initialData,
  (data) => {
    if (data) {
      form.amount = String(data.amount)
      form.date = data.date.slice(0, 10)
      form.description = data.description ?? ''
      form.categoryId = data.categoryId ?? ''
    }
  }
)

async function handleImageUpload(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  ocrLoading.value = true
  ocrSuccess.value = false

  try {
    const base64 = await fileToBase64(file)
    const result = await llmStore.uploadReceipt(base64, file.type)
    if (result?.expense) {
      if (result.expense.amount) form.amount = String(result.expense.amount)
      if (result.expense.date) form.date = result.expense.date
      if (result.expense.description) form.description = result.expense.description
      if (result.expense.merchant && !form.description) form.description = result.expense.merchant
      ocrSuccess.value = true
    }
  } finally {
    ocrLoading.value = false
    // Reset file input
    target.value = ''
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip data URI prefix — backend expects raw base64
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function handleSubmit(): void {
  if (!validate()) return
  const data: CreateExpenseRequest = {
    amount: Number(form.amount),
    date: form.date,
    description: form.description || undefined,
    categoryId: form.categoryId || undefined,
  }
  emit('submit', data)
}
</script>
