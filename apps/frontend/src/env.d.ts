/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_URL: string
  readonly VITE_EXPENSE_URL: string
  readonly VITE_BUDGET_URL: string
  readonly VITE_INCOME_URL: string
  readonly VITE_DASHBOARD_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
