export const FETCH_TIMEOUT_MS = 8_000

export function remainingMs(start: number): number {
  return FETCH_TIMEOUT_MS - (Date.now() - start)
}

export function safeHttpError(status: number): string {
  if (status >= 500) return 'Remote server error'
  if (status === 429) return 'Rate limited'
  if (status === 401 || status === 403) return 'Authentication failed'
  if (status === 404) return 'Endpoint not found'
  if (status >= 400) return 'Request rejected by remote'
  return `Unexpected status ${status}`
}

export function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300
}

export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}
