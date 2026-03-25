import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, unwrap, registerAuthHandlers } from '../services/api.service'
import type { AuthTokens, UserProfile, LoginRequest, RegisterRequest } from '@financer/shared'

const REFRESH_TOKEN_KEY = 'financer_refresh_token'

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const accessToken = ref<string | null>(null)
  const user = ref<UserProfile | null>(null)

  // --- Getters ---
  const isAuthenticated = computed(() => !!accessToken.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isSuperAdmin = computed(() => user.value?.role === 'superadmin')
  const isAdminOrAbove = computed(() => user.value?.role === 'admin' || user.value?.role === 'superadmin')

  // --- Helpers ---
  function storeTokens(tokens: AuthTokens): void {
    accessToken.value = tokens.accessToken
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
  }

  // --- Actions ---
  async function login(email: string, password: string): Promise<void> {
    const payload: LoginRequest = { email, password }
    const tokens = unwrap<AuthTokens>(
      await authApi.post<{ data: AuthTokens }>('/auth/login', payload)
    )
    storeTokens(tokens)
    await fetchProfile()
  }

  async function register(email: string, password: string, name: string): Promise<void> {
    const payload: RegisterRequest = { email, password, name }
    const tokens = unwrap<AuthTokens>(
      await authApi.post<{ data: AuthTokens }>('/auth/register', payload)
    )
    storeTokens(tokens)
    await fetchProfile()
  }

  async function logout(): Promise<void> {
    // Revoke refresh token on the server (best-effort)
    try {
      if (accessToken.value) {
        await authApi.post('/auth/logout')
      }
    } catch {
      // Server-side revocation failed — still clear local state
    }
    accessToken.value = null
    user.value = null
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }

  async function refreshTokens(): Promise<AuthTokens> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refreshToken) throw new Error('No refresh token stored')
    const tokens = unwrap<AuthTokens>(
      await authApi.post<{ data: AuthTokens }>('/auth/refresh', { refreshToken })
    )
    storeTokens(tokens)
    return tokens
  }

  async function fetchProfile(): Promise<void> {
    user.value = unwrap<UserProfile>(await authApi.get<{ data: UserProfile }>('/auth/me'))
  }

  async function initialize(): Promise<void> {
    // Wire up the auth handlers so axios interceptors can call back into the store
    registerAuthHandlers({
      getAccessToken: () => accessToken.value,
      refreshTokens,
      logout,
    })

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refreshToken) return
    try {
      await refreshTokens()
      await fetchProfile()
    } catch {
      // Clear local state only — skip backend call during init failure
      accessToken.value = null
      user.value = null
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
  }

  return {
    accessToken,
    user,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    isAdminOrAbove,
    login,
    register,
    logout,
    refreshTokens,
    fetchProfile,
    initialize,
  }
})
