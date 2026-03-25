import { reactive, watch } from 'vue'

export function useForm<T extends Record<string, unknown>>(
  initialValues: T,
  validator: (data: T) => Record<string, string> | null,
) {
  const form = reactive({ ...initialValues }) as T
  const errors = reactive<Record<string, string>>({})

  function clearErrors(): void {
    for (const key of Object.keys(errors)) {
      delete errors[key]
    }
  }

  function validate(): boolean {
    clearErrors()
    const result = validator(form)
    if (result) {
      Object.assign(errors, result)
      return false
    }
    return true
  }

  function reset(values?: Partial<T>): void {
    clearErrors()
    Object.assign(form, initialValues, values ?? {})
  }

  // Clear only the changed field's error when user types
  let prev: Record<string, unknown> = { ...form }
  watch(() => ({ ...form }), (next: Record<string, unknown>) => {
    for (const key of Object.keys(next)) {
      if (next[key] !== prev[key] && errors[key]) {
        delete errors[key]
      }
    }
    prev = { ...next }
  })

  return { form, errors, validate, reset, clearErrors }
}
