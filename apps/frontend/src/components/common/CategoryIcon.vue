<template>
  <!-- eslint-disable-next-line vue/no-v-html -- Icons are hardcoded SVG strings, not user input -->
  <span
    class="inline-flex items-center justify-center shrink-0"
    :class="sizeClass"
    v-html="iconSvg"
  ></span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  icon: string
  size?: 'sm' | 'md'
}>(), {
  size: 'sm',
})

const sizeClass = computed(() => props.size === 'md' ? 'w-5 h-5' : 'w-3.5 h-3.5')
const viewBox = '0 0 24 24'
const stroke = 'currentColor'
const sw = '2'

const ICON_MAP: Record<string, string> = {
  utensils: `<svg class="w-full h-full" fill="none" stroke="${stroke}" viewBox="${viewBox}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="${sw}" d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>`,
  car: `<svg class="w-full h-full" fill="none" stroke="${stroke}" viewBox="${viewBox}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="${sw}" d="M5 17h14M5 17a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h8l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2M5 17v2m14-2v2M8 14h.01M16 14h.01"/></svg>`,
  home: `<svg class="w-full h-full" fill="none" stroke="${stroke}" viewBox="${viewBox}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="${sw}" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
  'heart-pulse': `<svg class="w-full h-full" fill="none" stroke="${stroke}" viewBox="${viewBox}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="${sw}" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`,
  tv: `<svg class="w-full h-full" fill="none" stroke="${stroke}" viewBox="${viewBox}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="${sw}" d="M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM8 21h8m-4-4v4"/></svg>`,
  'shopping-bag': `<svg class="w-full h-full" fill="none" stroke="${stroke}" viewBox="${viewBox}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="${sw}" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>`,
  'book-open': `<svg class="w-full h-full" fill="none" stroke="${stroke}" viewBox="${viewBox}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="${sw}" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>`,
  zap: `<svg class="w-full h-full" fill="none" stroke="${stroke}" viewBox="${viewBox}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="${sw}" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  plane: `<svg class="w-full h-full" fill="none" stroke="${stroke}" viewBox="${viewBox}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="${sw}" d="M12 19l-7-7 1.41-1.41L11 15.17V2h2v13.17l4.59-4.58L19 12l-7 7z" transform="rotate(-45 12 12)"/></svg>`,
  tag: `<svg class="w-full h-full" fill="none" stroke="${stroke}" viewBox="${viewBox}"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="${sw}" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>`,
}

const iconSvg = computed(() => ICON_MAP[props.icon] ?? ICON_MAP['tag']!)
</script>
