<template>
  <!-- Floating chat button -->
  <button
    v-if="!isOpen"
    aria-label="Open financial assistant chat"
    class="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all duration-200 hover:scale-105"
    @click="isOpen = true"
  >
    <svg
      class="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  </button>

  <!-- Chat panel -->
  <div
    v-if="isOpen"
    class="fixed bottom-6 right-6 z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
    :style="{ width: `${size.w}px`, height: `${size.h}px` }"
  >
    <!-- Resize handle (top-left corner) — 3-line diagonal grip -->
    <div
      class="absolute top-0 left-0 w-5 h-5 cursor-nw-resize z-10 group flex items-center justify-center"
      @mousedown.prevent="startResize"
    >
      <svg class="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" viewBox="0 0 10 10">
        <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
        <line x1="9" y1="4" x2="4" y2="9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
        <line x1="9" y1="7" x2="7" y2="9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
      </svg>
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white shrink-0">
      <div class="flex items-center gap-2">
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
      <button
        aria-label="Close chat"
        class="p-1 rounded hover:bg-indigo-500 transition-colors"
        @click="isOpen = false"
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

    <ChatMessages />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import ChatMessages from './ChatMessages.vue'

const STORAGE_KEY = 'financer-chat-size'
const MIN_W = 320
const MIN_H = 400
const MAX_W = 900
const MAX_H = 1200
const DEFAULT_W = 384
const DEFAULT_H = 500

const isOpen = ref(false)

const size = reactive(loadSize())

function loadSize(): { w: number; h: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { w?: number; h?: number }
      return {
        w: clamp(parsed.w ?? DEFAULT_W, MIN_W, MAX_W),
        h: clamp(parsed.h ?? DEFAULT_H, MIN_H, MAX_H),
      }
    }
  } catch { /* ignore */ }
  return { w: DEFAULT_W, h: DEFAULT_H }
}

function saveSize(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ w: size.w, h: size.h }))
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function startResize(e: MouseEvent): void {
  const startX = e.clientX
  const startY = e.clientY
  const startW = size.w
  const startH = size.h

  function onMove(ev: MouseEvent): void {
    // Dragging top-left: moving left = wider, moving up = taller
    size.w = clamp(startW - (ev.clientX - startX), MIN_W, MAX_W)
    size.h = clamp(startH - (ev.clientY - startY), MIN_H, MAX_H)
  }

  function onUp(): void {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    saveSize()
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

onMounted(() => {
  const saved = loadSize()
  size.w = saved.w
  size.h = saved.h
})
</script>
