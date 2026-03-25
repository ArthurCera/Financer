<template>
  <div class="flex flex-col flex-1 min-h-0">
    <!-- Messages -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto p-4 space-y-3"
    >
      <!-- Empty state -->
      <div
        v-if="llmStore.messages.length === 0 && !llmStore.loading"
        class="text-center text-slate-400 mt-12"
      >
        <svg
          class="w-10 h-10 mx-auto mb-2 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <p class="text-sm">
          Ask me about your finances
        </p>
        <p class="text-xs mt-1">
          e.g. "How much did I spend on food?"
        </p>
      </div>

      <!-- Message list -->
      <div
        v-for="msg in llmStore.messages"
        :key="msg.id"
        class="flex"
        :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div class="max-w-[80%] relative group">
          <!-- Message bubble -->
          <div
            v-if="msg.role === 'user'"
            class="px-3 py-2 rounded-2xl text-sm leading-relaxed transition-opacity bg-indigo-600 text-white rounded-br-md"
            :class="[
              msg.status === 'failed' ? 'opacity-50' : '',
              msg.status === 'pending' ? 'opacity-70' : '',
            ]"
          >
            {{ msg.content }}
          </div>
          <div
            v-else
            class="px-3 py-2 rounded-2xl text-sm leading-relaxed transition-opacity bg-slate-100 text-slate-800 rounded-bl-md chat-markdown"
            :class="[
              msg.status === 'failed' ? 'opacity-50' : '',
            ]"
            v-html="renderMarkdown(msg.content)"
          />

          <!-- Failed indicator + actions -->
          <div
            v-if="msg.status === 'failed'"
            class="flex items-center gap-1.5 mt-1"
            :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <svg
              class="w-3.5 h-3.5 text-red-500 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="text-[10px] text-red-500">Failed to send</span>
            <button
              v-if="msg.role === 'user'"
              class="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
              @click="llmStore.retryMessage(msg.id)"
            >
              Retry
            </button>
            <button
              class="text-[10px] text-slate-400 hover:text-slate-600"
              @click="llmStore.dismissMessage(msg.id)"
            >
              Dismiss
            </button>
          </div>

          <!-- Pending indicator -->
          <div
            v-else-if="msg.status === 'pending' && msg.role === 'user'"
            class="flex items-center gap-1 mt-0.5 justify-end"
          >
            <svg
              class="w-3 h-3 text-slate-400 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span class="text-[10px] text-slate-400">Sending</span>
          </div>
        </div>
      </div>

      <!-- Thinking indicator -->
      <div
        v-if="llmStore.loading"
        class="flex justify-start"
      >
        <div class="max-w-[80%] px-3 py-2 rounded-2xl rounded-bl-md text-sm leading-relaxed bg-slate-100 text-slate-500 flex items-center gap-2">
          <span class="inline-flex gap-1">
            <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
            <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
            <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
          </span>
          <span class="text-xs text-slate-400">Thinking...</span>
        </div>
      </div>
    </div>

    <!-- Error banner -->
    <div
      v-if="llmStore.error"
      class="px-4 py-2 bg-red-50 text-red-600 text-xs border-t border-red-100"
    >
      {{ llmStore.error }}
    </div>

    <!-- Input -->
    <form
      class="flex items-center gap-2 px-3 py-3 border-t border-slate-200 shrink-0"
      @submit.prevent="send"
    >
      <input
        v-model="input"
        type="text"
        placeholder="Type a message..."
        aria-label="Chat message"
        class="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      <button
        type="submit"
        aria-label="Send message"
        :disabled="!input.trim()"
        class="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 text-white disabled:opacity-40 hover:bg-indigo-700 transition-colors shrink-0"
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
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from 'vue'
import { Marked } from 'marked'
import { useLLMStore } from '../../stores/llm.store'
import { useSubAccountStore } from '../../stores/subaccount.store'

const marked = new Marked({ breaks: true, gfm: true })

function renderMarkdown(text: string): string {
  if (!text) return ''
  return marked.parse(text) as string
}

const llmStore = useLLMStore()
const subAccountStore = useSubAccountStore()
const input = ref('')

watch(() => subAccountStore.activeSubAccountId, async () => {
  llmStore.resetForAccountSwitch()
  await llmStore.fetchHistory()
  await scrollToBottom()
})
const messagesContainer = ref<HTMLElement | null>(null)

onMounted(async () => {
  await llmStore.fetchHistory()
  await scrollToBottom()
})

async function send(): Promise<void> {
  const text = input.value.trim()
  if (!text) return
  input.value = ''
  llmStore.sendMessage(text)
  await scrollToBottom()
}

async function scrollToBottom(): Promise<void> {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

watch(() => llmStore.messages.length, () => scrollToBottom())
</script>

<style scoped>
.chat-markdown :deep(p) { margin: 0.25rem 0; }
.chat-markdown :deep(p:first-child) { margin-top: 0; }
.chat-markdown :deep(p:last-child) { margin-bottom: 0; }
.chat-markdown :deep(ul),
.chat-markdown :deep(ol) { margin: 0.25rem 0; padding-left: 1.25rem; }
.chat-markdown :deep(ul) { list-style-type: disc; }
.chat-markdown :deep(ol) { list-style-type: decimal; }
.chat-markdown :deep(li) { margin: 0.125rem 0; }
.chat-markdown :deep(strong) { font-weight: 600; }
.chat-markdown :deep(em) { font-style: italic; }
.chat-markdown :deep(code) { background: rgba(0,0,0,0.06); padding: 0.1rem 0.3rem; border-radius: 0.25rem; font-size: 0.8em; }
.chat-markdown :deep(pre) { background: rgba(0,0,0,0.06); padding: 0.5rem; border-radius: 0.375rem; overflow-x: auto; margin: 0.375rem 0; }
.chat-markdown :deep(pre code) { background: none; padding: 0; }
.chat-markdown :deep(h1),
.chat-markdown :deep(h2),
.chat-markdown :deep(h3) { font-weight: 600; margin: 0.375rem 0 0.125rem; }
.chat-markdown :deep(h1) { font-size: 1.1em; }
.chat-markdown :deep(h2) { font-size: 1.05em; }
.chat-markdown :deep(h3) { font-size: 1em; }
.chat-markdown :deep(table) { border-collapse: collapse; margin: 0.375rem 0; font-size: 0.85em; width: 100%; }
.chat-markdown :deep(th),
.chat-markdown :deep(td) { border: 1px solid rgba(0,0,0,0.1); padding: 0.25rem 0.5rem; text-align: left; }
.chat-markdown :deep(th) { background: rgba(0,0,0,0.04); font-weight: 600; }
.chat-markdown :deep(blockquote) { border-left: 3px solid rgba(0,0,0,0.15); padding-left: 0.5rem; margin: 0.25rem 0; color: rgba(0,0,0,0.6); }
.chat-markdown :deep(hr) { border: none; border-top: 1px solid rgba(0,0,0,0.1); margin: 0.375rem 0; }
.chat-markdown :deep(a) { color: #4f46e5; text-decoration: underline; }
</style>
