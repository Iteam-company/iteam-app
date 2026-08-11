const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000') as string

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Access tokens are short-lived (~15m, see server/src/auth/jwt.constants.ts).
// A single in-flight refresh is shared across concurrent 401s so a burst of
// requests doesn't each try to rotate the refresh token — only the first
// caller refreshes, the rest await the same promise.
let refreshInFlight: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return false

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) throw new Error('refresh failed')

    const data = await res.json() as { accessToken: string; refreshToken: string }
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    return true
  } catch {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    return false
  }
}

async function request<T>(path: string, init?: RequestInit, isRetry = false): Promise<T> {
  const token = localStorage.getItem('accessToken')

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  })

  // A 401 on a request that actually carried a token means the token expired
  // (not "never logged in") — try one silent refresh-and-retry before giving
  // up. Skip this for /auth/refresh itself so a bad refresh token can't loop.
  if (res.status === 401 && token && !isRetry && path !== '/auth/refresh') {
    refreshInFlight ??= refreshAccessToken().finally(() => { refreshInFlight = null })
    const refreshed = await refreshInFlight
    if (refreshed) return request<T>(path, init, true)
  }

  // An empty body (204, or Nest serialising a `null` return) is not valid JSON.
  // It must stay null — turning it into {} makes "no result" look like a result.
  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!res.ok) {
    const message =
      (data as { message?: string | string[] } | null)?.message
        ?? res.statusText
    throw new ApiError(
      res.status,
      Array.isArray(message) ? message.join(', ') : message,
    )
  }

  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
