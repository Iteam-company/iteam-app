import type { QueryClient } from '@tanstack/react-query'
import { authApi, clearTokens } from './api'
import { ME_KEY } from './mutations'
import type { MeResponse } from './types'

export type AuthState =
  | { status: 'authenticated'; me: MeResponse }
  | { status: 'unauthenticated' }

/**
 * Resolves whether the current visitor is actually authenticated — not just
 * "there's a token in localStorage", but "the backend still accepts it"
 * (transparently refreshing an expired access token via the lib/api.ts
 * interceptor if needed).
 *
 * Meant to run from a route's `beforeLoad`, so the router's pending state
 * (see router.tsx's defaultPendingComponent) covers the wait instead of
 * flashing the sign-in page or the dashboard before we actually know.
 *
 * Populates the same react-query cache entry `useMe()` reads (ME_KEY), so
 * once this resolves, every `useMe()` call in the app underneath gets the
 * cached result instantly instead of re-fetching.
 */
export async function resolveAuth(queryClient: QueryClient): Promise<AuthState> {
  if (typeof window === 'undefined') return { status: 'unauthenticated' }
  if (!localStorage.getItem('accessToken')) return { status: 'unauthenticated' }

  try {
    const me = await queryClient.ensureQueryData({
      queryKey: ME_KEY,
      queryFn: () => authApi.me(),
    })
    return { status: 'authenticated', me }
  } catch {
    clearTokens()
    return { status: 'unauthenticated' }
  }
}
