<template>
  <AppLayout>
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-xl font-bold text-slate-900">
          Admin Dashboard
        </h1>
        <p class="text-sm text-slate-500">
          {{ auth.user?.role === 'superadmin' ? 'System overview and user management' : 'Manage your sub-accounts' }}
        </p>
      </div>
      <AppButton
        v-if="auth.user?.role === 'admin'"
        @click="showCreateModal = true"
      >
        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Sub-Account
      </AppButton>
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
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p class="text-slate-500 text-sm">Loading admin data...</p>
      </div>
    </div>

    <!-- Error -->
    <div
      v-else-if="adminStore.error"
      class="rounded-xl bg-red-50 border border-red-200 p-6 text-center"
    >
      <p class="text-red-700 text-sm">{{ adminStore.error }}</p>
    </div>

    <!-- ========== SUPERADMIN LAYOUT ========== -->
    <div v-else-if="isSuperAdmin">
      <!-- Stats Cards (no expense data for superadmin) -->
      <div
        v-if="adminStore.stats"
        class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
      >
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Users</p>
            <p class="text-2xl font-bold text-slate-900 mt-0.5">{{ adminStore.stats.totalUsers }}</p>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">LLM Messages</p>
            <p class="text-2xl font-bold text-slate-900 mt-0.5">{{ adminStore.stats.totalLLMChats }}</p>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Categorizations</p>
            <p class="text-2xl font-bold text-slate-900 mt-0.5">{{ adminStore.stats.totalCategorizationsRun }}</p>
          </div>
        </div>
      </div>

      <!-- Two-column layout: LLM Analytics + User Management -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Left Column: LLM Analytics -->
        <div class="space-y-6">
          <div
            v-if="adminStore.detailedLLMStats"
            class="bg-white rounded-xl border border-slate-200 shadow-sm"
          >
            <div class="px-5 py-4 border-b border-slate-200">
              <h2 class="text-base font-semibold text-slate-900">LLM Analytics</h2>
              <p class="text-xs text-slate-500 mt-0.5">AI assistant usage and engagement metrics</p>
            </div>
            <div class="p-5 space-y-5">
              <div class="grid grid-cols-2 gap-4">
                <div class="rounded-lg bg-slate-50 p-4">
                  <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Messages</p>
                  <p class="text-xl font-bold text-slate-900 mt-1">{{ adminStore.detailedLLMStats.totalMessages }}</p>
                </div>
                <div class="rounded-lg bg-slate-50 p-4">
                  <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Unique Chat Users</p>
                  <p class="text-xl font-bold text-slate-900 mt-1">{{ adminStore.detailedLLMStats.totalChats }}</p>
                </div>
                <div class="rounded-lg bg-slate-50 p-4">
                  <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg Messages / User</p>
                  <p class="text-xl font-bold text-slate-900 mt-1">{{ adminStore.detailedLLMStats.avgMessagesPerUser }}</p>
                </div>
                <div class="rounded-lg bg-slate-50 p-4">
                  <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Users (7d)</p>
                  <p class="text-xl font-bold text-slate-900 mt-1">{{ adminStore.detailedLLMStats.activeUsersLast7Days }}</p>
                </div>
              </div>
              <div class="border-t border-slate-100 pt-4">
                <h3 class="text-sm font-medium text-slate-700 mb-3">Message Activity</h3>
                <div class="space-y-3">
                  <div>
                    <div class="flex items-center justify-between text-xs mb-1">
                      <span class="text-slate-500">Last 7 days</span>
                      <span class="font-semibold text-slate-900">{{ adminStore.detailedLLMStats.messagesLast7Days }}</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2">
                      <div class="bg-indigo-500 h-2 rounded-full transition-all duration-500" :style="{ width: messageBarWidth7d + '%' }"></div>
                    </div>
                  </div>
                  <div>
                    <div class="flex items-center justify-between text-xs mb-1">
                      <span class="text-slate-500">Last 30 days</span>
                      <span class="font-semibold text-slate-900">{{ adminStore.detailedLLMStats.messagesLast30Days }}</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2">
                      <div class="bg-emerald-500 h-2 rounded-full transition-all duration-500" :style="{ width: messageBarWidth30d + '%' }"></div>
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
              <h2 class="text-base font-semibold text-slate-900">Top LLM Users</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-slate-200 text-left">
                    <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">User</th>
                    <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Messages</th>
                    <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Share</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="u in adminStore.detailedLLMStats.topUsers"
                    :key="u.userId"
                    class="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td class="px-5 py-3">
                      <p class="font-medium text-slate-900">{{ u.name }}</p>
                      <p class="text-xs text-slate-400">{{ u.email }}</p>
                    </td>
                    <td class="px-5 py-3 text-right font-semibold text-slate-700">{{ u.messageCount }}</td>
                    <td class="px-5 py-3 w-32">
                      <div class="flex items-center gap-2">
                        <div class="flex-1 bg-slate-100 rounded-full h-1.5">
                          <div class="bg-indigo-500 h-1.5 rounded-full" :style="{ width: topUserBarWidth(u.messageCount) + '%' }"></div>
                        </div>
                        <span class="text-xs text-slate-400 w-8 text-right">{{ topUserPercent(u.messageCount) }}%</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Right Column: User Management (accordion: admins with sub-accounts) -->
        <div>
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div class="px-5 py-4 border-b border-slate-200">
              <h2 class="text-base font-semibold text-slate-900">User Management</h2>
              <p class="text-xs text-slate-500 mt-0.5">Admins and their managed sub-accounts</p>
            </div>
            <div class="divide-y divide-slate-200">
              <div
                v-for="admin in groupedUsers"
                :key="admin.id"
              >
                <!-- Admin row (clickable accordion header) -->
                <button
                  class="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left"
                  @click="toggleExpanded(admin.id)"
                >
                  <svg
                    class="w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0"
                    :class="expandedAdmins.has(admin.id) ? 'rotate-90' : ''"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-slate-900 text-sm">{{ admin.name }}</span>
                      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{{ admin.role }}</span>
                    </div>
                    <p class="text-xs text-slate-400 truncate">{{ admin.email }}</p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-xs text-slate-500">{{ admin.subAccounts.length }} sub-account{{ admin.subAccounts.length !== 1 ? 's' : '' }}</p>
                    <p class="text-xs text-slate-400">Joined {{ formatDate(admin.createdAt) }}</p>
                  </div>
                  <button
                    v-if="!isCurrentUser(admin.id)"
                    class="ml-2 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
                    :disabled="roleUpdating === admin.id"
                    @click.stop="toggleUserRole(admin)"
                  >
                    <svg v-if="roleUpdating === admin.id" class="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Demote
                  </button>
                </button>
                <!-- Sub-account rows (collapsed by default) -->
                <div
                  v-if="expandedAdmins.has(admin.id) && admin.subAccounts.length > 0"
                  class="bg-slate-50 border-t border-slate-100"
                >
                  <div
                    v-for="sub in admin.subAccounts"
                    :key="sub.id"
                    class="flex items-center gap-3 px-5 py-2.5 pl-12 border-b border-slate-100 last:border-b-0"
                  >
                    <svg class="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <div class="flex-1 min-w-0">
                      <span class="text-sm text-slate-700">{{ sub.name }}</span>
                      <p class="text-xs text-slate-400 truncate">{{ sub.email }}</p>
                    </div>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">user</span>
                    <span class="text-xs text-slate-500">{{ sub.expenseCount }} expenses</span>
                    <span class="text-xs text-red-500 font-medium">{{ formatCurrency(sub.totalSpent) }}</span>
                    <p class="text-xs text-slate-400">{{ formatDate(sub.createdAt) }}</p>
                  </div>
                </div>
                <div
                  v-else-if="expandedAdmins.has(admin.id)"
                  class="bg-slate-50 border-t border-slate-100 px-5 py-3 pl-12 text-xs text-slate-400"
                >
                  No sub-accounts
                </div>
              </div>
              <div
                v-if="groupedUsers.length === 0"
                class="px-5 py-8 text-center text-sm text-slate-400"
              >
                No admin accounts found
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== ADMIN LAYOUT ========== -->
    <div v-else class="space-y-6">
      <!-- Stats Cards -->
      <div
        v-if="adminStore.stats"
        class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Accounts</p>
            <p class="text-2xl font-bold text-slate-900 mt-0.5">{{ adminStore.stats.totalUsers }}</p>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
            <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Expenses Paid</p>
            <p class="text-2xl font-bold text-slate-900 mt-0.5">{{ adminStore.stats.totalExpenses }}</p>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">LLM Messages</p>
            <p class="text-2xl font-bold text-slate-900 mt-0.5">{{ adminStore.stats.totalLLMChats }}</p>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide">Categorizations</p>
            <p class="text-2xl font-bold text-slate-900 mt-0.5">{{ adminStore.stats.totalCategorizationsRun }}</p>
          </div>
        </div>
      </div>

      <!-- All Users Overview header -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold text-slate-900">All Users Overview</h2>
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
            <input v-model="chartShowAll" type="checkbox" class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" @change="refreshAdminCharts" />
            All
          </label>
          <select v-model="chartMonth" class="input-base w-auto text-sm" :disabled="chartShowAll" :class="{ 'opacity-50': chartShowAll }" @change="refreshAdminCharts">
            <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
          <select v-model="chartYear" class="input-base w-auto text-sm" :disabled="chartShowAll" :class="{ 'opacity-50': chartShowAll }" @change="refreshAdminCharts">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
          <button
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            :class="{ 'animate-spin': refreshingCharts }"
            title="Refresh"
            :disabled="refreshingCharts"
            @click="refreshAdminCharts"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Main chart + summary cards row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Expenses by Category chart (left) -->
        <ExpenseChart
          v-if="adminStore.expensesByCategory.length > 0"
          :categories="adminStore.expensesByCategory"
          title="Expenses by Category"
        />
        <div v-else class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 class="text-base font-semibold text-slate-900 mb-4">Expenses by Category</h3>
          <p class="text-sm text-slate-400 text-center py-8">No data yet</p>
        </div>

        <!-- Summary cards (right) -->
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p class="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Expenses</p>
              <p class="text-2xl font-bold text-red-600">{{ formatCurrency(adminStore.periodTotals.totalExpenseAmount) }}</p>
              <p class="text-xs text-slate-400 mt-1">Selected time frame</p>
            </div>
            <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p class="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Monthly Balance</p>
              <p class="text-2xl font-bold" :class="adminPeriodBalance >= 0 ? 'text-emerald-600' : 'text-red-600'">{{ formatCurrency(adminPeriodBalance) }}</p>
              <p class="text-xs text-slate-400 mt-1">Selected time frame</p>
            </div>
          </div>
          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Income</p>
            <p class="text-2xl font-bold text-emerald-600">{{ formatCurrency(adminStore.periodTotals.totalIncome) }}</p>
            <p class="text-xs text-slate-400 mt-1">Selected time frame</p>
          </div>
          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">All-Time Savings</p>
            <p class="text-2xl font-bold" :class="adminAllTimeSavings >= 0 ? 'text-emerald-600' : 'text-red-600'">{{ formatCurrency(adminAllTimeSavings) }}</p>
            <p class="text-xs text-slate-400 mt-1">Lifetime income minus expenses (all time)</p>
          </div>
          <ExpenseChart
            v-if="adminStore.categoryCounts.length > 0"
            :categories="categoryCountsAsBreakdown"
            title="Items per Category"
            :value-formatter="formatCount"
          />
        </div>
      </div>

      <!-- Sub-account detail (shown when account selected from sidebar) -->
      <div id="sub-account-detail" v-if="adminStore.selectedSubAccountId">
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm">
            <!-- Detail header -->
            <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 class="text-base font-semibold text-slate-900">{{ selectedUserName }}</h2>
                <p class="text-xs text-slate-500">{{ selectedUserEmail }}</p>
              </div>
              <div class="flex items-center gap-3">
                <label class="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    v-model="detailShowAll"
                    type="checkbox"
                    class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    @change="reloadDetail"
                  />
                  All
                </label>
                <select v-model="detailMonth" class="input-base w-auto text-sm" :disabled="detailShowAll" :class="{ 'opacity-50': detailShowAll }" @change="reloadDetail">
                  <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
                </select>
                <select v-model="detailYear" class="input-base w-auto text-sm" :disabled="detailShowAll" :class="{ 'opacity-50': detailShowAll }" @change="reloadDetail">
                  <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
                </select>
              </div>
            </div>

            <!-- Loading sub-account data -->
            <div
              v-if="adminStore.subAccountLoading"
              class="flex items-center justify-center py-20"
            >
              <svg class="animate-spin w-8 h-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>

            <template v-else-if="adminStore.subAccountDetail">
              <!-- Tab bar -->
              <div class="border-b border-slate-200 px-5">
                <nav class="flex gap-6 -mb-px">
                  <button
                    v-for="tab in tabs"
                    :key="tab.key"
                    class="py-3 text-sm font-medium border-b-2 transition-colors"
                    :class="activeTab === tab.key
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'"
                    @click="activeTab = tab.key"
                  >
                    {{ tab.label }}
                  </button>
                </nav>
              </div>

              <!-- Tab: Chart -->
              <div v-if="activeTab === 'chart'" class="p-5">
                <ExpenseChart :categories="adminStore.subAccountDetail.dashboard.expensesByCategory" />
              </div>

              <!-- Tab: Expenses -->
              <div v-else-if="activeTab === 'expenses'">
                <div class="px-5 py-3 border-b border-slate-100 flex items-center justify-end">
                  <button
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                    :disabled="categorizing"
                    @click="handleCategorizeSubAccount"
                  >
                    <svg v-if="categorizing" class="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {{ categorizing ? 'Categorizing...' : 'Auto-categorize' }}
                  </button>
                </div>
                <div class="overflow-x-auto">
                <table
                  v-if="adminStore.subAccountDetail.dashboard.recentExpenses.length > 0"
                  class="w-full text-sm"
                >
                  <thead>
                    <tr class="border-b border-slate-200 text-left">
                      <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Date</th>
                      <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Description</th>
                      <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Category</th>
                      <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="exp in adminStore.subAccountDetail.dashboard.recentExpenses"
                      :key="exp.id"
                      class="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td class="px-5 py-3 text-slate-600">{{ formatDate(exp.date) }}</td>
                      <td class="px-5 py-3 text-slate-900">{{ exp.description || '\u2014' }}</td>
                      <td class="px-5 py-3">
                        <span
                          class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                          :style="{
                            backgroundColor: resolveColor(exp) + '18',
                            color: resolveColor(exp),
                          }"
                        >
                          <CategoryIcon :icon="exp.categoryIcon ?? 'tag'" />
                          {{ exp.categoryName ?? 'Uncategorized' }}
                        </span>
                      </td>
                      <td class="px-5 py-3 text-right font-semibold text-red-600">{{ formatCurrency(exp.amount) }}</td>
                    </tr>
                  </tbody>
                </table>
                <div v-else class="py-12 text-center text-slate-400 text-sm">No expenses this period</div>
                </div>
              </div>

              <!-- Tab: Budgets -->
              <div v-else-if="activeTab === 'budgets'" class="overflow-x-auto">
                <table
                  v-if="adminStore.subAccountDetail.dashboard.budgetVsActual.length > 0"
                  class="w-full text-sm"
                >
                  <thead>
                    <tr class="border-b border-slate-200 text-left">
                      <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Category</th>
                      <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Budgeted</th>
                      <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Spent</th>
                      <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Remaining</th>
                      <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="b in adminStore.subAccountDetail.dashboard.budgetVsActual"
                      :key="b.categoryId ?? 'total'"
                      class="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td class="px-5 py-3 font-medium text-slate-900">{{ b.categoryName }}</td>
                      <td class="px-5 py-3 text-right text-slate-600">{{ formatCurrency(b.budgeted) }}</td>
                      <td class="px-5 py-3 text-right text-red-600 font-semibold">{{ formatCurrency(b.spent) }}</td>
                      <td class="px-5 py-3 text-right" :class="b.remaining >= 0 ? 'text-emerald-600' : 'text-red-600'">{{ formatCurrency(b.remaining) }}</td>
                      <td class="px-5 py-3 w-32">
                        <div class="w-full bg-slate-100 rounded-full h-2">
                          <div
                            class="h-2 rounded-full transition-all"
                            :class="b.percentage > 100 ? 'bg-red-500' : b.percentage > 80 ? 'bg-amber-500' : 'bg-emerald-500'"
                            :style="{ width: Math.min(b.percentage, 100) + '%' }"
                          ></div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div v-else class="py-12 text-center text-slate-400 text-sm">No budgets this period</div>
              </div>

              <!-- Tab: Income -->
              <div v-else-if="activeTab === 'income'" class="overflow-x-auto">
                <table
                  v-if="adminStore.subAccountDetail.incomes.length > 0"
                  class="w-full text-sm"
                >
                  <thead>
                    <tr class="border-b border-slate-200 text-left">
                      <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Date</th>
                      <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Description</th>
                      <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Source</th>
                      <th class="px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="inc in adminStore.subAccountDetail.incomes"
                      :key="inc.id"
                      class="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td class="px-5 py-3 text-slate-600">{{ formatDate(inc.date) }}</td>
                      <td class="px-5 py-3 text-slate-900">{{ inc.description || '\u2014' }}</td>
                      <td class="px-5 py-3 text-slate-600">{{ inc.source || '\u2014' }}</td>
                      <td class="px-5 py-3 text-right font-semibold text-emerald-600">{{ formatCurrency(inc.amount) }}</td>
                    </tr>
                  </tbody>
                </table>
                <div v-else class="py-12 text-center text-slate-400 text-sm">No income this period</div>
              </div>

              <!-- Tab: Chat History -->
              <div v-else-if="activeTab === 'chat'" class="max-h-[500px] overflow-y-auto">
                <div
                  v-if="adminStore.subAccountDetail.chatHistory.length > 0"
                  class="divide-y divide-slate-100"
                >
                  <div
                    v-for="msg in adminStore.subAccountDetail.chatHistory"
                    :key="msg.id"
                    class="px-5 py-3"
                  >
                    <div class="flex items-center gap-2 mb-1">
                      <span
                        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        :class="msg.role === 'user' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'"
                      >{{ msg.role }}</span>
                      <span class="text-xs text-slate-400">{{ formatDate(msg.createdAt) }}</span>
                    </div>
                    <p class="text-sm text-slate-700 whitespace-pre-wrap">{{ msg.content }}</p>
                  </div>
                </div>
                <div v-else class="py-12 text-center text-slate-400 text-sm">No chat history</div>
              </div>
            </template>
          </div>
        </div>
    </div>

    <!-- Create Sub-Account Modal -->
    <AppModal v-model="showCreateModal" title="Add Sub-Account">
      <form class="space-y-4" @submit.prevent="handleCreateSubAccount">
        <AppInput v-model="createForm.name" label="Name" placeholder="e.g. John Doe" required />
        <AppInput v-model="createForm.email" label="Email" type="email" placeholder="e.g. john@example.com" required />
        <AppInput v-model="createForm.password" label="Password" type="password" placeholder="Min 6 characters" required />
        <div v-if="createError" class="text-sm text-red-600">{{ createError }}</div>
        <div class="flex gap-3 pt-2">
          <AppButton type="submit" :loading="subAccountStore.loading" class="flex-1">Create Account</AppButton>
          <AppButton variant="secondary" type="button" @click="showCreateModal = false">Cancel</AppButton>
        </div>
      </form>
    </AppModal>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import AppLayout from '../layouts/AppLayout.vue'
import AppButton from '../components/common/AppButton.vue'
import AppInput from '../components/common/AppInput.vue'
import AppModal from '../components/common/AppModal.vue'
import ExpenseChart from '../components/dashboard/ExpenseChart.vue'
import CategoryIcon from '../components/common/CategoryIcon.vue'
import { useAdminStore } from '../stores/admin.store'
import { useAuthStore } from '../stores/auth.store'
import { useSubAccountStore } from '../stores/subaccount.store'
import { useLLMStore } from '../stores/llm.store'
import { setActingAs } from '../services/api.service'
import { formatCurrency, formatDate } from '../utils/formatting'
import { MONTHS } from '../utils/constants'
import type { AdminUserResponse, CategoryBreakdownResponse } from '@financer/shared'

const adminStore = useAdminStore()
const auth = useAuthStore()
const subAccountStore = useSubAccountStore()

// ---------- Shared ----------
const isSuperAdmin = computed(() => auth.user?.role === 'superadmin')
const isCurrentUser = (userId: string) => userId === auth.user?.id
const showCreateModal = ref(false)
const createForm = reactive({ email: '', password: '', name: '' })
const createError = ref<string | null>(null)

async function handleCreateSubAccount(): Promise<void> {
  createError.value = null
  const result = await subAccountStore.createSubAccount({
    email: createForm.email.trim(),
    password: createForm.password,
    name: createForm.name.trim(),
  })
  if (result) {
    showCreateModal.value = false
    createForm.email = ''
    createForm.password = ''
    createForm.name = ''
    await adminStore.fetchAll()
  } else {
    createError.value = subAccountStore.error
  }
}

// ---------- Superadmin accordion ----------
const roleUpdating = ref<string | null>(null)
const expandedAdmins = ref(new Set<string>())

interface GroupedAdmin {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  subAccounts: AdminUserResponse[]
}

const groupedUsers = computed<GroupedAdmin[]>(() => {
  const admins = adminStore.users.filter(u => u.role === 'admin' || u.role === 'superadmin')
  const usersByManager = new Map<string, AdminUserResponse[]>()
  for (const u of adminStore.users) {
    if (u.role === 'user' && u.managedBy) {
      const list = usersByManager.get(u.managedBy) ?? []
      list.push(u)
      usersByManager.set(u.managedBy, list)
    }
  }
  return admins.map(a => ({
    id: a.id,
    name: a.name,
    email: a.email,
    role: a.role,
    createdAt: a.createdAt,
    subAccounts: usersByManager.get(a.id) ?? [],
  }))
})

function toggleExpanded(adminId: string): void {
  const s = new Set(expandedAdmins.value)
  if (s.has(adminId)) {
    s.delete(adminId)
  } else {
    s.add(adminId)
  }
  expandedAdmins.value = s
}

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

async function toggleUserRole(user: { id: string; role: string }): Promise<void> {
  const newRole = user.role === 'admin' ? 'user' : 'admin'
  roleUpdating.value = user.id
  try {
    await adminStore.updateUserRole(user.id, newRole)
  } finally {
    roleUpdating.value = null
  }
}

// ---------- Admin detail panel ----------
const tabs = [
  { key: 'chart', label: 'Chart' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'budgets', label: 'Budgets' },
  { key: 'income', label: 'Income' },
  { key: 'chat', label: 'Chat History' },
] as const

type TabKey = typeof tabs[number]['key']
const activeTab = ref<TabKey>('chart')

const now = new Date()
const months = MONTHS
const years = computed(() => {
  const currentYear = now.getFullYear()
  return Array.from({ length: 5 }, (_, i) => currentYear - i)
})
const detailMonth = ref(now.getMonth() + 1)
const detailYear = ref(now.getFullYear())
const detailShowAll = ref(false)

const selectedUserName = computed(() => {
  const u = adminStore.users.find(u => u.id === adminStore.selectedSubAccountId)
  return u?.name ?? ''
})

const selectedUserEmail = computed(() => {
  const u = adminStore.users.find(u => u.id === adminStore.selectedSubAccountId)
  return u?.email ?? ''
})

const adminPeriodBalance = computed(() =>
  adminStore.periodTotals.totalIncome - adminStore.periodTotals.totalExpenseAmount
)

const adminAllTimeSavings = computed(() =>
  (adminStore.stats?.totalIncome ?? 0) - (adminStore.stats?.totalExpenseAmount ?? 0)
)

const categoryCountsAsBreakdown = computed<CategoryBreakdownResponse[]>(() => {
  const total = adminStore.categoryCounts.reduce((s, c) => s + c.count, 0)
  return adminStore.categoryCounts.map((c) => ({
    categoryId: '',
    categoryName: c.categoryName,
    color: c.color,
    total: c.count,
    percentage: total > 0 ? Math.round((c.count / total) * 100) : 0,
  }))
})

// Lookup map: category name -> { color, icon } from the expensesByCategory data
// Fallback for when recentExpenses don't have categoryColor/categoryIcon (stale cache)
const categoryLookup = computed(() => {
  const map = new Map<string, { color: string }>()
  const cats = adminStore.subAccountDetail?.dashboard.expensesByCategory ?? []
  for (const c of cats) {
    map.set(c.categoryName, { color: c.color })
  }
  return map
})

function resolveColor(exp: { categoryName: string | null; categoryColor?: string | null }): string {
  if (exp.categoryColor) return exp.categoryColor
  if (exp.categoryName) {
    const found = categoryLookup.value.get(exp.categoryName)
    if (found) return found.color
  }
  return '#9CA3AF'
}

function formatCount(val: number): string {
  return String(Math.round(val))
}

function getDetailPeriod(): { month?: number; year?: number } {
  if (detailShowAll.value) return {}
  return { month: detailMonth.value, year: detailYear.value }
}

async function selectSubAccount(userId: string): Promise<void> {
  activeTab.value = 'chart'
  const { month, year } = getDetailPeriod()
  await adminStore.fetchSubAccountDetail(userId, month, year)
}

async function reloadDetail(): Promise<void> {
  if (adminStore.selectedSubAccountId) {
    const { month, year } = getDetailPeriod()
    await adminStore.fetchSubAccountDetail(adminStore.selectedSubAccountId, month, year)
  }
}

const llmStore = useLLMStore()
const categorizing = ref(false)
const refreshingCharts = ref(false)
const chartMonth = ref(now.getMonth() + 1)
const chartYear = ref(now.getFullYear())
const chartShowAll = ref(false)

function getChartPeriod(): { month?: number; year?: number } {
  if (chartShowAll.value) return {}
  return { month: chartMonth.value, year: chartYear.value }
}

async function refreshAdminCharts(): Promise<void> {
  refreshingCharts.value = true
  try {
    const { month, year } = getChartPeriod()
    await Promise.all([
      adminStore.fetchExpensesByCategory(month, year),
      adminStore.fetchCategoryCounts(month, year),
      adminStore.fetchPeriodTotals(month, year),
    ])
  } finally {
    refreshingCharts.value = false
  }
}

async function handleCategorizeSubAccount(): Promise<void> {
  if (!adminStore.selectedSubAccountId) return
  categorizing.value = true
  setActingAs(adminStore.selectedSubAccountId)
  try {
    await llmStore.categorizeBatch(detailMonth.value, detailYear.value)
    await reloadDetail()
  } finally {
    setActingAs(null)
    categorizing.value = false
  }
}

onMounted(() => adminStore.fetchAll())
</script>
