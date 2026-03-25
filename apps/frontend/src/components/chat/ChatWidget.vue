<template>
  <!-- Floating chat button -->
  <button
    v-if="!isOpen"
    class="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all duration-200 hover:scale-105"
    @click="openChat"
  >
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  </button>

  <!-- Chat panel -->
  <div
    v-if="isOpen"
    class="fixed bottom-6 right-6 z-50 w-96 h-[500px] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white shrink-0">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span class="font-semibold text-sm">Financial Assistant</span>
      </div>
      <button
        class="p-1 rounded hover:bg-indigo-500 transition-colors"
        @click="isOpen = false"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Messages -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-3">
      <div v-if="llmStore.messages.length === 0 && !llmStore.loading" class="text-center text-slate-400 mt-12">
        <svg class="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p class="text-sm">Ask me about your finances</p>
        <p class="text-xs mt-1">e.g. "How much did I spend on food?"</p>
      </div>

      <div
        v-for="msg in llmStore.messages"
        :key="msg.id"
        class="flex"
        :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed"
          :class="
            msg.role === 'user'
              ? 'bg-indigo-600 text-white rounded-br-md'
              : 'bg-slate-100 text-slate-800 rounded-bl-md'
          "
        >
          {{ msg.content }}
        </div>
      </div>

      <!-- Typing indicator -->
      <div v-if="llmStore.loading" class="flex justify-start">
        <div class="bg-slate-100 text-slate-500 px-4 py-2 rounded-2xl rounded-bl-md text-sm">
          <span class="inline-flex gap-1">
            <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0ms" />
            <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 150ms" />
            <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 300ms" />
          </span>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-if="llmStore.error" class="px-4 py-2 bg-red-50 text-red-600 text-xs border-t border-red-100">
      {{ llmStore.error }}
    </div>

    <!-- Input -->
    <form class="flex items-center gap-2 px-3 py-3 border-t border-slate-200 shrink-0" @submit.prevent="send">
      <input
        v-model="input"
        type="text"
        placeholder="Type a message..."
        class="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        :disabled="llmStore.loading"
      />
      <button
        type="submit"
        :disabled="!input.trim() || llmStore.loading"
        class="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 text-white disabled:opacity-40 hover:bg-indigo-700 transition-colors shrink-0"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useLLMStore } from '../../stores/llm.store'

const llmStore = useLLMStore()
const isOpen = ref(false)
const input = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
let historyLoaded = false

async function openChat(): Promise<void> {
  isOpen.value = true
  if (!historyLoaded) {
    historyLoaded = true
    await llmStore.fetchHistory()
    await scrollToBottom()
  }
}

async function send(): Promise<void> {
  const text = input.value.trim()
  if (!text) return
  input.value = ''
  await llmStore.sendMessage(text)
  await scrollToBottom()
}

async function scrollToBottom(): Promise<void> {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// Auto-scroll when messages change
watch(() => llmStore.messages.length, () => {
  scrollToBottom()
})
</script>
