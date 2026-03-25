<template>
  <AppLayout>
    <div class="mb-6">
      <h1 class="text-xl font-bold text-slate-900">Admin Dashboard</h1>
      <p class="text-sm text-slate-500">System overview and management</p>
    </div>

    <!-- Loading -->
    <div v-if="adminStore.loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <svg class="animate-spin w-10 h-10 text-indigo-600 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
        <p class="text-slate-500 text-sm">Loading admin data...</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="adminStore.error" class="rounded-xl bg-red-50 border border-red-200 p-6 text-center">
      <p class="text-red-700 text-sm">{{ adminStore.error }}</p>
    </div>

    <template v-else>
      <!-- Stats Cards -->
      <div v-if="adminStore.stats" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Users</p>
          <p class="text-2xl font-bold text-slate-900 mt-1">{{ adminStore.stats.totalUsers }}</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Expenses</p>
          <p class="text-2xl font-bold text-slate-900 mt-1">{{ adminStore.stats.totalExpenses }}</p>
          <p class="text-xs text-slate-400 mt-1">{{ formatCurrency(adminStore.stats.totalIncome) }} total income</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">LLM Chat Messages</p>
          <p class="text-2xl font-bold text-slate-900 mt-1">{{ adminStore.stats.totalLLMChats }}</p>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Categorizations</p>
          <p class="text-2xl font-bold text-slate-900 mt-1">{{ adminStore.stats.totalCategorizationsRun }}</p>
        </div>
      </div>

      <!-- Users Table -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
        <div class="px-5 py-4 border-b border-slate-200">
          <h2 class="text-base font-semibold text-slate-900">Users</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 text-left">
                <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Name</th>
                <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Email</th>
                <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Role</th>
                <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Expenses</th>
                <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Total Spent</th>
                <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Joined</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="u in adminStore.users"
                :key="u.id"
                class="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td class="px-5 py-3 font-medium text-slate-900">{{ u.name }}</td>
                <td class="px-5 py-3 text-slate-600">{{ u.email }}</td>
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
                <td class="px-5 py-3 text-right text-slate-600">{{ u.expenseCount }}</td>
                <td class="px-5 py-3 text-right font-semibold text-red-600">{{ formatCurrency(u.totalSpent) }}</td>
                <td class="px-5 py-3 text-slate-500">{{ formatDate(u.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- LLM Usage -->
      <div v-if="adminStore.llmUsage" class="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 class="text-base font-semibold text-slate-900">LLM Usage</h2>
          <span class="text-xs text-slate-500">{{ adminStore.llmUsage.totalMessages }} total messages</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 text-left">
                <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">User</th>
                <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Email</th>
                <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Messages</th>
                <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Last Active</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="u in adminStore.llmUsage.users"
                :key="u.userId"
                class="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td class="px-5 py-3 font-medium text-slate-900">{{ u.name }}</td>
                <td class="px-5 py-3 text-slate-600">{{ u.email }}</td>
                <td class="px-5 py-3 text-right text-slate-600">{{ u.chatMessageCount }}</td>
                <td class="px-5 py-3 text-slate-500">{{ u.lastChatAt ? formatDate(u.lastChatAt) : 'Never' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AppLayout from '../layouts/AppLayout.vue'
import { useAdminStore } from '../stores/admin.store'
import { formatCurrency, formatDate } from '../utils/formatting'

const adminStore = useAdminStore()

onMounted(() => adminStore.fetchAll())
</script>
