<template>
  <AppLayout>
    <div class="mb-6">
      <h1 class="text-xl font-bold text-slate-900">
        Admin Dashboard
      </h1>
      <p class="text-sm text-slate-500">
        System overview, LLM analytics, and user management
      </p>
    </div>

    <!-- Loading -->
    <div
      v-if="adminStore.loading"
      class="flex items-center justify-center py-20"
    >
      <div class="text-center">
        <svg
          class="animate-spin w-10 h-10 text-indigo-600 mx-auto mb-3"
          xmlns="http://www.w3.org/2000/svg"
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p class="text-slate-500 text-sm">
          Loading admin data...
        </p>
      </div>
    </div>

    <!-- Error -->
    <div
      v-else-if="adminStore.error"
      class="rounded-xl bg-red-50 border border-red-200 p-6 text-center"
    >
      <p class="text-red-700 text-sm">
        {{ adminStore.error }}
      </p>
    </div>

    <template v-else>
      <!-- Stats Cards -->
      <div
        v-if="adminStore.stats"
        class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"
      >
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <svg
              class="w-5 h-5 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div>
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Total Users
            </p>
            <p class="text-2xl font-bold text-slate-900 mt-0.5">
              {{ adminStore.stats.totalUsers }}
            </p>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
            <svg
              class="w-5 h-5 text-red-600"
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
          <div>
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Total Expenses
            </p>
            <p class="text-2xl font-bold text-slate-900 mt-0.5">
              {{ adminStore.stats.totalExpenses }}
            </p>
            <p class="text-xs text-slate-400 mt-0.5">
              {{ formatCurrency(adminStore.stats.totalIncome) }} total income
            </p>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <svg
              class="w-5 h-5 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <div>
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">
              LLM Messages
            </p>
            <p class="text-2xl font-bold text-slate-900 mt-0.5">
              {{ adminStore.stats.totalLLMChats }}
            </p>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <svg
              class="w-5 h-5 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          </div>
          <div>
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Categorizations
            </p>
            <p class="text-2xl font-bold text-slate-900 mt-0.5">
              {{ adminStore.stats.totalCategorizationsRun }}
            </p>
          </div>
        </div>
      </div>

      <!-- Two-column layout: LLM Analytics + User Management -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Left Column: LLM Analytics -->
        <div class="space-y-6">
          <!-- LLM Overview Cards -->
          <div
            v-if="adminStore.detailedLLMStats"
            class="bg-white rounded-xl border border-slate-200 shadow-sm"
          >
            <div class="px-5 py-4 border-b border-slate-200">
              <h2 class="text-base font-semibold text-slate-900">
                LLM Analytics
              </h2>
              <p class="text-xs text-slate-500 mt-0.5">
                AI assistant usage and engagement metrics
              </p>
            </div>
            <div class="p-5 space-y-5">
              <!-- Metrics Grid -->
              <div class="grid grid-cols-2 gap-4">
                <div class="rounded-lg bg-slate-50 p-4">
                  <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Total Messages
                  </p>
                  <p class="text-xl font-bold text-slate-900 mt-1">
                    {{ adminStore.detailedLLMStats.totalMessages }}
                  </p>
                </div>
                <div class="rounded-lg bg-slate-50 p-4">
                  <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Unique Chat Users
                  </p>
                  <p class="text-xl font-bold text-slate-900 mt-1">
                    {{ adminStore.detailedLLMStats.totalChats }}
                  </p>
                </div>
                <div class="rounded-lg bg-slate-50 p-4">
                  <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Avg Messages / User
                  </p>
                  <p class="text-xl font-bold text-slate-900 mt-1">
                    {{ adminStore.detailedLLMStats.avgMessagesPerUser }}
                  </p>
                </div>
                <div class="rounded-lg bg-slate-50 p-4">
                  <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Active Users (7d)
                  </p>
                  <p class="text-xl font-bold text-slate-900 mt-1">
                    {{ adminStore.detailedLLMStats.activeUsersLast7Days }}
                  </p>
                </div>
              </div>

              <!-- Activity Trend -->
              <div class="border-t border-slate-100 pt-4">
                <h3 class="text-sm font-medium text-slate-700 mb-3">
                  Message Activity
                </h3>
                <div class="space-y-3">
                  <div>
                    <div class="flex items-center justify-between text-xs mb-1">
                      <span class="text-slate-500">Last 7 days</span>
                      <span class="font-semibold text-slate-900">{{ adminStore.detailedLLMStats.messagesLast7Days }}</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2">
                      <div
                        class="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                        :style="{ width: messageBarWidth7d + '%' }"
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div class="flex items-center justify-between text-xs mb-1">
                      <span class="text-slate-500">Last 30 days</span>
                      <span class="font-semibold text-slate-900">{{ adminStore.detailedLLMStats.messagesLast30Days }}</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2">
                      <div
                        class="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                        :style="{ width: messageBarWidth30d + '%' }"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Top LLM Users -->
          <div
            v-if="adminStore.detailedLLMStats && adminStore.detailedLLMStats.topUsers.length > 0"
            class="bg-white rounded-xl border border-slate-200 shadow-sm"
          >
            <div class="px-5 py-4 border-b border-slate-200">
              <h2 class="text-base font-semibold text-slate-900">
                Top LLM Users
              </h2>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-slate-200 text-left">
                    <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                      User
                    </th>
                    <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">
                      Messages
                    </th>
                    <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Share
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="u in adminStore.detailedLLMStats.topUsers"
                    :key="u.userId"
                    class="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td class="px-5 py-3">
                      <p class="font-medium text-slate-900">
                        {{ u.name }}
                      </p>
                      <p class="text-xs text-slate-400">
                        {{ u.email }}
                      </p>
                    </td>
                    <td class="px-5 py-3 text-right font-semibold text-slate-700">
                      {{ u.messageCount }}
                    </td>
                    <td class="px-5 py-3 w-32">
                      <div class="flex items-center gap-2">
                        <div class="flex-1 bg-slate-100 rounded-full h-1.5">
                          <div
                            class="bg-indigo-500 h-1.5 rounded-full"
                            :style="{ width: topUserBarWidth(u.messageCount) + '%' }"
                          ></div>
                        </div>
                        <span class="text-xs text-slate-400 w-8 text-right">
                          {{ topUserPercent(u.messageCount) }}%
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Right Column: User Management -->
        <div>
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 class="text-base font-semibold text-slate-900">
                  User Management
                </h2>
                <p class="text-xs text-slate-500 mt-0.5">
                  Manage user accounts and roles
                </p>
              </div>
              <span class="text-xs text-slate-500">
                Showing {{ paginatedUsers.length }} of {{ adminStore.users.length }} users
              </span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-slate-200 text-left">
                    <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Name
                    </th>
                    <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Email
                    </th>
                    <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Role
                    </th>
                    <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">
                      Expenses
                    </th>
                    <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">
                      Total Spent
                    </th>
                    <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Joined
                    </th>
                    <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="u in paginatedUsers"
                    :key="u.id"
                    class="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td class="px-5 py-3 font-medium text-slate-900">
                      {{ u.name }}
                    </td>
                    <td class="px-5 py-3 text-slate-600">
                      {{ u.email }}
                    </td>
                    <td class="px-5 py-3">
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        :class="u.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-600'"
                      >
                        {{ u.role }}
                      </span>
                    </td>
                    <td class="px-5 py-3 text-right text-slate-600">
                      {{ u.expenseCount }}
                    </td>
                    <td class="px-5 py-3 text-right font-semibold text-red-600">
                      {{ formatCurrency(u.totalSpent) }}
                    </td>
                    <td class="px-5 py-3 text-slate-500">
                      {{ formatDate(u.createdAt) }}
                    </td>
                    <td class="px-5 py-3 text-center">
                      <button
                        class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        :class="u.role === 'admin'
                          ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          : 'bg-purple-50 text-purple-700 hover:bg-purple-100'"
                        :disabled="roleUpdating === u.id"
                        @click="toggleUserRole(u)"
                      >
                        <svg
                          v-if="roleUpdating === u.id"
                          class="animate-spin w-3 h-3"
                          xmlns="http://www.w3.org/2000/svg"
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
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        {{ u.role === 'admin' ? 'Demote' : 'Promote' }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- Pagination controls -->
            <div
              v-if="userTotalPages > 1"
              class="px-5 py-3 border-t border-slate-200 flex items-center justify-between"
            >
              <button
                class="text-sm text-indigo-600 hover:text-indigo-800 disabled:text-slate-300 disabled:cursor-not-allowed"
                :disabled="userPage === 1"
                @click="userPage--"
              >
                Previous
              </button>
              <span class="text-xs text-slate-500">
                Page {{ userPage }} of {{ userTotalPages }}
              </span>
              <button
                class="text-sm text-indigo-600 hover:text-indigo-800 disabled:text-slate-300 disabled:cursor-not-allowed"
                :disabled="userPage === userTotalPages"
                @click="userPage++"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppLayout from '../layouts/AppLayout.vue'
import { useAdminStore } from '../stores/admin.store'
import { formatCurrency, formatDate } from '../utils/formatting'
import type { AdminUserResponse } from '@financer/shared'

const adminStore = useAdminStore()

const USERS_PER_PAGE = 20

const userPage = ref(1)
const roleUpdating = ref<string | null>(null)

const userTotalPages = computed(() =>
  Math.max(1, Math.ceil(adminStore.users.length / USERS_PER_PAGE))
)

const paginatedUsers = computed(() => {
  const start = (userPage.value - 1) * USERS_PER_PAGE
  return adminStore.users.slice(start, start + USERS_PER_PAGE)
})

const messageBarWidth7d = computed(() => {
  const stats = adminStore.detailedLLMStats
  if (!stats || stats.totalMessages === 0) return 0
  return Math.min(100, Math.round((stats.messagesLast7Days / stats.totalMessages) * 100))
})

const messageBarWidth30d = computed(() => {
  const stats = adminStore.detailedLLMStats
  if (!stats || stats.totalMessages === 0) return 0
  return Math.min(100, Math.round((stats.messagesLast30Days / stats.totalMessages) * 100))
})

function topUserBarWidth(messageCount: number): number {
  const stats = adminStore.detailedLLMStats
  if (!stats || stats.topUsers.length === 0) return 0
  const maxCount = stats.topUsers[0].messageCount
  return maxCount > 0 ? Math.round((messageCount / maxCount) * 100) : 0
}

function topUserPercent(messageCount: number): number {
  const stats = adminStore.detailedLLMStats
  if (!stats || stats.totalMessages === 0) return 0
  return Math.round((messageCount / stats.totalMessages) * 100)
}

async function toggleUserRole(user: AdminUserResponse): Promise<void> {
  const newRole = user.role === 'admin' ? 'user' : 'admin'
  roleUpdating.value = user.id
  try {
    await adminStore.updateUserRole(user.id, newRole)
  } finally {
    roleUpdating.value = null
  }
}

onMounted(() => adminStore.fetchAll())
</script>
