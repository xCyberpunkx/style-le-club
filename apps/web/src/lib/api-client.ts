import { env } from './env'
import { ApiError } from './api-error'

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

// A 401 mid-session almost always means the short-lived access-token cookie
// expired, not that the user is actually logged out — the refresh cookie
// (30 days) is very likely still valid. Retrying once after a silent
// refresh means an expired access token is invisible to the rest of the
// app, exactly as the blueprint calls for.
//
// Concurrent requests that all 401 at once must share a single in-flight
// refresh call rather than each independently hitting /auth/refresh —
// refresh tokens are rotated on every use, so a second concurrent refresh
// call would invalidate the first one's brand-new token.
let inFlightRefresh: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  if (!inFlightRefresh) {
    inFlightRefresh = fetch(`${env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        inFlightRefresh = null
      })
  }
  return inFlightRefresh
}

async function parseJsonSafely(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Low-level request function. Returns the response envelope exactly as the
 * API sends it (`{ data }` or `{ data, meta }`) rather than unwrapping —
 * callers destructure what they need, so paginated list responses don't
 * silently lose their `meta`.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options

  const doFetch = () =>
    fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
      ...rest,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

  let res = await doFetch()

  // Only the auth-flow endpoints themselves are excluded from the silent
  // refresh-and-retry dance — a 401 from /auth/login or /auth/refresh is a
  // real, final answer. /auth/me is deliberately NOT excluded: a 401 there
  // usually just means the short-lived access-token cookie expired while
  // the refresh cookie is still good, which is the ordinary case this
  // retry exists to paper over (e.g. the dashboard was left open past the
  // access token's lifetime, then reloaded).
  const isAuthFlowEndpoint = path === '/auth/login' || path === '/auth/refresh' || path === '/auth/logout'

  if (res.status === 401 && !isAuthFlowEndpoint) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      res = await doFetch()
    }
  }

  const json = await parseJsonSafely(res)

  if (!res.ok) {
    throw new ApiError(res.status, json)
  }

  return json as T
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}
