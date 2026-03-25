import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'

declare module 'vue-router' {
  interface RouteMeta {
    layout?: string
    requiresAuth?: boolean
    requiresAdmin?: boolean
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/login',
    component: () => import('../views/LoginView.vue'),
    meta: { layout: 'auth' },
  },
  {
    path: '/register',
    component: () => import('../views/RegisterView.vue'),
    meta: { layout: 'auth' },
  },
  {
    path: '/dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/expenses',
    component: () => import('../views/ExpensesView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/budgets',
    component: () => import('../views/BudgetsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/income',
    component: () => import('../views/IncomeView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/categories',
    name: 'categories',
    component: () => import('../views/CategoriesView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/chat',
    component: () => import('../views/ChatView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin',
    component: () => import('../views/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

let _initialized = false

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // On first navigation, try to restore session from stored refresh token
  if (!_initialized) {
    _initialized = true
    try {
      await auth.initialize()
    } catch (err) {
      console.error('[Router] Auth initialization failed:', err)
    }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // Admin-only routes
  if (to.meta.requiresAdmin && !['admin', 'superadmin'].includes(auth.user?.role ?? '')) {
    return { path: '/dashboard' }
  }

  // Redirect admin/superadmin to /admin when they land on /dashboard
  if (auth.isAuthenticated && to.path === '/dashboard' && ['admin', 'superadmin'].includes(auth.user?.role ?? '')) {
    return { path: '/admin' }
  }

  // If already authenticated, redirect away from auth pages
  if ((to.path === '/login' || to.path === '/register') && auth.isAuthenticated) {
    const role = auth.user?.role ?? ''
    return { path: ['admin', 'superadmin'].includes(role) ? '/admin' : '/dashboard' }
  }
})

export default router
