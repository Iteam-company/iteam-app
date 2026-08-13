// Shown while a route's beforeLoad/loader is in flight — most notably while
// resolveAuth() (lib/auth/guard.ts) is checking whether the visitor is
// actually signed in. Keeps that check from flashing the wrong page.
export default function RouteLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}
