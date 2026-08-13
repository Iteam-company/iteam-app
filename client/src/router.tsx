import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { getContext, } from './integrations/tanstack-query/root-provider'
import RouteLoader from './components/RouteLoader'

export function getRouter() {
  const context = getContext()

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // Covers resolveAuth() (lib/auth/guard.ts) resolving on the initial
    // load — shows this instead of flashing sign-in or the dashboard while
    // we don't yet know if the visitor is authenticated.
    defaultPendingComponent: RouteLoader,
    defaultPendingMs: 200,
    defaultPendingMinMs: 200,
  })

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
