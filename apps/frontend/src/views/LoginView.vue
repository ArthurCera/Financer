<template>
  <AuthLayout>
    <h2 class="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
    <p class="text-sm text-slate-500 mb-6">Sign in to your account</p>

    <div v-if="error" class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
      <p class="text-sm text-red-700">{{ error }}</p>
    </div>

    <form @submit.prevent="handleLogin" class="space-y-4">
      <AppInput
        v-model="form.email"
        label="Email address"
        type="email"
        placeholder="you@example.com"
        required
        :error="errors.email"
      />

      <AppInput
        v-model="form.password"
        label="Password"
        type="password"
        placeholder="••••••••"
        required
        :error="errors.password"
      />

      <AppButton type="submit" size="lg" :loading="loading" class="w-full mt-2">
        Sign in
      </AppButton>
    </form>

    <p class="mt-6 text-center text-sm text-slate-500">
      Don't have an account?
      <RouterLink to="/register" class="font-medium text-indigo-600 hover:text-indigo-700">
        Sign up
      </RouterLink>
    </p>
  </AuthLayout>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthLayout from '../layouts/AuthLayout.vue'
import AppInput from '../components/common/AppInput.vue'
import AppButton from '../components/common/AppButton.vue'
import { useAuthStore } from '../stores/auth.store'

const auth = useAuthStore()
const router = useRouter()

const form = reactive({ email: '', password: '' })
const errors = reactive<Record<string, string>>({})
const loading = ref(false)
const error = ref<string | null>(null)

function validate(): boolean {
  const newErrors: Record<string, string> = {}
  if (!form.email) newErrors['email'] = 'Email is required'
  if (!form.password) newErrors['password'] = 'Password is required'
  Object.assign(errors, newErrors)
  return Object.keys(newErrors).length === 0
}

async function handleLogin(): Promise<void> {
  error.value = null
  if (!validate()) return

  loading.value = true
  try {
    await auth.login(form.email, form.password)
    await router.push('/dashboard')
  } catch (err) {
    error.value = extractMessage(err)
  } finally {
    loading.value = false
  }
}

function extractMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { error?: { message?: string } } } }).response
    return res?.data?.error?.message ?? 'Invalid email or password'
  }
  return 'An unexpected error occurred. Please try again.'
}
</script>
