export function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { error?: { message?: string } } } }).response
    return res?.data?.error?.message ?? 'An unexpected error occurred'
  }
  if (err instanceof Error) return err.message
  return 'An unexpected error occurred'
}
