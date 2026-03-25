<template>
  <AppLayout>
    <!-- Header row -->
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-xl font-bold text-slate-900">
          Categories
        </h1>
        <p class="text-sm text-slate-500">
          Manage your expense categories
        </p>
      </div>

      <AppButton @click="openCreate">
        <svg
          class="w-4 h-4 mr-1.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        Add Category
      </AppButton>
    </div>

    <!-- Error banner -->
    <ErrorBanner :message="categoryStore.error" />

    <!-- Table -->
    <AppTable
      :columns="columns"
      :rows="tableRows"
    >
      <template #cell-color="{ value }">
        <div class="flex items-center gap-2">
          <span
            class="inline-block w-5 h-5 rounded-full border border-slate-200"
            :style="{ backgroundColor: value as string }"
          ></span>
          <span class="text-xs text-slate-500 font-mono">{{ value }}</span>
        </div>
      </template>
      <template #cell-type="{ value }">
        <span
          v-if="value === 'Default'"
          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600"
        >
          Default
        </span>
        <span
          v-else
          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700"
        >
          Custom
        </span>
      </template>
      <template #actions="{ row }">
        <div
          v-if="row['type'] === 'Custom'"
          class="flex items-center justify-end gap-2"
        >
          <AppButton
            variant="secondary"
            size="sm"
            @click="openEditById(row['id'] as string)"
          >
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
          <svg
            class="w-14 h-14 mx-auto mb-3 opacity-40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <p class="text-sm font-medium">
            No categories found
          </p>
          <p class="text-xs mt-1">
            Click "Add Category" to create your first custom category
          </p>
        </div>
      </template>
    </AppTable>

    <!-- Create/Edit Modal -->
    <AppModal
      v-model="showModal"
      :title="editingCategory ? 'Edit Category' : 'Add Category'"
    >
      <form
        class="space-y-4"
        @submit.prevent="handleSubmit"
      >
        <AppInput
          v-model="form.name"
          label="Name"
          placeholder="e.g. Subscriptions"
          required
          :error="formErrors.name"
        />

        <div class="w-full">
          <label class="block text-sm font-medium text-slate-700 mb-1">
            Color
          </label>
          <div class="flex items-center gap-3">
            <input
              v-model="form.color"
              type="color"
              class="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer p-0.5"
            />
            <span class="text-sm text-slate-500 font-mono">{{ form.color }}</span>
          </div>
        </div>

        <AppInput
          v-model="form.icon"
          label="Icon"
          placeholder="e.g. tag, shopping-cart, home"
          :error="formErrors.icon"
        />

        <div class="flex gap-3 pt-2">
          <AppButton
            type="submit"
            :loading="categoryStore.mutating"
            class="flex-1"
          >
            {{ editingCategory ? 'Update Category' : 'Add Category' }}
          </AppButton>
          <AppButton
            variant="secondary"
            type="button"
            @click="showModal = false"
          >
            Cancel
          </AppButton>
        </div>
      </form>
    </AppModal>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import AppLayout from '../layouts/AppLayout.vue'
import AppButton from '../components/common/AppButton.vue'
import AppTable, { type TableColumn } from '../components/common/AppTable.vue'
import AppModal from '../components/common/AppModal.vue'
import AppInput from '../components/common/AppInput.vue'
import ErrorBanner from '../components/common/ErrorBanner.vue'
import { useCategoryStore } from '../stores/category.store'
import type { CategoryResponse, CreateCategoryRequest, UpdateCategoryRequest } from '@financer/shared'

const categoryStore = useCategoryStore()

const showModal = ref(false)
const editingCategory = ref<CategoryResponse | null>(null)
const deletingId = ref<string | null>(null)

const form = reactive({
  name: '',
  color: '#6B7280',
  icon: 'tag',
})

const formErrors = reactive<Record<string, string>>({})

const columns: TableColumn[] = [
  { key: 'name', label: 'Name' },
  { key: 'color', label: 'Color' },
  { key: 'icon', label: 'Icon' },
  { key: 'type', label: 'Type' },
]

const tableRows = computed<Record<string, unknown>[]>(() =>
  categoryStore.categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    icon: c.icon,
    type: c.isDefault ? 'Default' : 'Custom',
  })),
)

function resetForm(): void {
  form.name = ''
  form.color = '#6B7280'
  form.icon = 'tag'
  formErrors.name = ''
  formErrors.icon = ''
}

function openCreate(): void {
  editingCategory.value = null
  resetForm()
  showModal.value = true
}

function openEditById(id: string): void {
  const found = categoryStore.categories.find((c) => c.id === id) ?? null
  editingCategory.value = found
  if (found) {
    form.name = found.name
    form.color = found.color
    form.icon = found.icon
  }
  formErrors.name = ''
  formErrors.icon = ''
  showModal.value = true
}

function validate(): boolean {
  let valid = true
  formErrors.name = ''
  formErrors.icon = ''

  if (!form.name.trim()) {
    formErrors.name = 'Name is required'
    valid = false
  }
  if (form.name.trim().length > 100) {
    formErrors.name = 'Name must be 100 characters or fewer'
    valid = false
  }
  if (form.icon && form.icon.trim().length > 50) {
    formErrors.icon = 'Icon must be 50 characters or fewer'
    valid = false
  }
  return valid
}

async function handleSubmit(): Promise<void> {
  if (!validate()) return

  try {
    if (editingCategory.value) {
      const data: UpdateCategoryRequest = {
        name: form.name.trim(),
        color: form.color,
        icon: form.icon.trim() || 'tag',
      }
      await categoryStore.updateCategory(editingCategory.value.id, data)
    } else {
      const data: CreateCategoryRequest = {
        name: form.name.trim(),
        color: form.color,
        icon: form.icon.trim() || undefined,
      }
      await categoryStore.createCategory(data)
    }
    showModal.value = false
  } catch {
    // Error already set in store
  }
}

async function handleDelete(id: string): Promise<void> {
  if (!confirm('Are you sure you want to delete this category?')) return
  deletingId.value = id
  try {
    await categoryStore.deleteCategory(id)
  } finally {
    deletingId.value = null
  }
}

onMounted(async () => {
  await categoryStore.fetchCategories()
})
</script>
