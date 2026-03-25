<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="$emit('update:modelValue', false)"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50"
          @click="$emit('update:modelValue', false)"
        ></div>

        <!-- Dialog -->
        <Transition
          enter-active-class="transition-all duration-200"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-150"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="modelValue"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            class="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            :style="maxWidth ? `max-width: ${maxWidth}` : ''"
          >
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3
                id="modal-title"
                class="text-lg font-semibold text-slate-900"
              >
                {{ title }}
              </h3>
              <button
                aria-label="Close dialog"
                class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                @click="$emit('update:modelValue', false)"
              >
                <svg
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="px-6 py-5">
              <slot></slot>
            </div>

            <!-- Footer -->
            <div
              v-if="$slots['footer']"
              class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3"
            >
              <slot name="footer"></slot>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    maxWidth?: string
  }>(),
  {}
)

defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()
</script>
