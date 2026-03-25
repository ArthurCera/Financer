<template>
  <div class="flex h-screen overflow-hidden bg-slate-50">
    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-slate-900 transition-transform duration-300"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 px-6 py-5 border-b border-slate-700/50">
        <div class="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 shrink-0">
          <svg
            class="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <span class="text-xl font-bold text-white tracking-tight">Financer</span>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150"
          :class="
            isActive(item.to)
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          "
          @click="sidebarOpen = false"
        >
          <!-- eslint-disable-next-line vue/no-v-html -- Icons are hardcoded SVG strings, not user input -->
          <span
            class="text-lg leading-none"
            v-html="item.icon"
          ></span>
          {{ item.label }}
        </RouterLink>
      </nav>

      <!-- User section -->
      <div class="px-4 py-4 border-t border-slate-700/50">
        <div class="flex items-center gap-3 px-3 py-2 mb-2">
          <div class="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500 text-white text-sm font-semibold shrink-0">
            {{ userInitial }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">
              {{ auth.user?.name ?? 'User' }}
            </p>
            <p class="text-xs text-slate-400 truncate">
              {{ auth.user?.email ?? '' }}
            </p>
          </div>
        </div>
        <button
          class="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors duration-150"
          @click="handleLogout"
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
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Sign out
        </button>
      </div>
    </aside>

    <!-- Mobile overlay -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-40 bg-black/50 md:hidden"
      @click="sidebarOpen = false"
    ></div>

    <!-- Main content -->
    <div class="flex-1 flex flex-col md:ml-64 min-w-0">
      <!-- Header -->
      <header class="sticky top-0 z-30 flex items-center gap-4 px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
        <!-- Mobile menu button -->
        <button
          class="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
          @click="sidebarOpen = !sidebarOpen"
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
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <div class="flex-1">
          <h2 class="text-lg font-semibold text-slate-900">
            {{ pageTitle }}
          </h2>
          <p class="text-xs text-slate-500">
            {{ currentDate }}
          </p>
        </div>

        <!-- Admin/Client toggle -->
        <div
          v-if="isAdmin"
          class="flex items-center bg-slate-100 rounded-lg p-0.5"
        >
          <button
            class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
            :class="viewMode === 'client'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'"
            @click="switchView('client')"
          >
            Client
          </button>
          <button
            class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
            :class="viewMode === 'admin'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'"
            @click="switchView('admin')"
          >
            Admin
          </button>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto p-6">
        <slot></slot>
      </main>
    </div>

    <!-- Floating chat widget (hidden on /chat page to avoid duplication) -->
    <ChatWidget v-if="showChatWidget" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import ChatWidget from '../components/chat/ChatWidget.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const sidebarOpen = ref(false)
const viewMode = ref<'client' | 'admin'>('client')

const isAdmin = computed(() => auth.user?.role === 'admin')

const clientNavItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>',
  },
  {
    to: '/expenses',
    label: 'Expenses',
    icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>',
  },
  {
    to: '/budgets',
    label: 'Budgets',
    icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>',
  },
  {
    to: '/income',
    label: 'Income',
    icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
  },
  {
    to: '/categories',
    label: 'Categories',
    icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>',
  },
  {
    to: '/chat',
    label: 'Chat',
    icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>',
  },
]

const adminNavItems = [
  {
    to: '/admin',
    label: 'Admin Dashboard',
    icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>',
  },
]

const navItems = computed(() =>
  viewMode.value === 'admin' && isAdmin.value ? adminNavItems : clientNavItems
)

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/expenses': 'Expenses',
  '/budgets': 'Budgets',
  '/income': 'Income',
  '/categories': 'Categories',
  '/chat': 'Chat',
  '/admin': 'Admin Dashboard',
}

const showChatWidget = computed(() => route.path !== '/chat')

const pageTitle = computed(() => pageTitles[route.path] ?? 'Financer')

// Sync viewMode with current route
watchEffect(() => {
  if (route.path.startsWith('/admin')) {
    viewMode.value = 'admin'
  } else {
    viewMode.value = 'client'
  }
})

function switchView(mode: 'client' | 'admin'): void {
  viewMode.value = mode
  if (mode === 'admin') {
    router.push('/admin')
  } else {
    router.push('/dashboard')
  }
}

const currentDate = computed(() =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
)

const userInitial = computed(() => {
  const name = auth.user?.name ?? auth.user?.email ?? 'U'
  return name.charAt(0).toUpperCase()
})

function isActive(path: string): boolean {
  return route.path === path
}

async function handleLogout(): Promise<void> {
  await auth.logout()
  await router.push('/login')
}
</script>
