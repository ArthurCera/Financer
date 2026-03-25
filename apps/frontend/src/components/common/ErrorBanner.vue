<script setup lang="ts">
defineProps<{ message: string | null }>()
</script>
<template>
  <div
    v-if="message"
    class="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3"
  >
    <p class="text-sm text-red-700">
      {{ message }}
    </p>
  </div>
</template>
