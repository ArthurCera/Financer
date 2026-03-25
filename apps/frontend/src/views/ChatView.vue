<template>
  <AppLayout>
    <div class="h-[calc(100vh-7.5rem)] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <!-- Header -->
      <div class="flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white shrink-0">
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
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <span class="font-semibold text-sm">Financial Assistant</span>
      </div>

      <ChatMessages class="flex-1 min-h-0" />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from '../layouts/AppLayout.vue'
import ChatMessages from '../components/chat/ChatMessages.vue'
</script>
