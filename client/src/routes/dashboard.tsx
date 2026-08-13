import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bell, Building2, CalendarDays, CheckCheck,
  Home, Lock, LogOut, Mail, Settings, User, Users,
} from 'lucide-react'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider,
} from '#/components/ui/sidebar'
import { Button } from '#/components/ui/button'
import { toggleLanguage } from '#/i18n'
import { useMyCompany } from '#/lib/company/mutations'
import { useSignOut } from '#/lib/auth/mutations'
import { resolveAuth } from '#/lib/auth/guard'
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from '#/lib/notifications/mutations'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async ({ context }) => {
    const auth = await resolveAuth(context.queryClient)
    if (auth.status !== 'authenticated') throw redirect({ to: '/auth/sign-in' })
  },
  component: DashboardLayout,
  ssr: false,
})

const NAV = [
  { to: '/dashboard', label: 'nav.overview', icon: Home, exact: true, requiresCompany: true },
  { to: '/dashboard/me', label: 'nav.me', icon: User, exact: false, requiresCompany: true },
  { to: '/dashboard/schedule', label: 'nav.schedule', icon: CalendarDays, exact: false, requiresCompany: true },
  { to: '/dashboard/team', label: 'nav.people', icon: Users, exact: false, requiresCompany: true },
  { to: '/dashboard/automation', label: 'nav.automation', icon: Mail, exact: false, requiresCompany: true },
  { to: '/dashboard/company', label: 'nav.company', icon: Building2, exact: false, requiresCompany: false },
]

const NAV_SYSTEM = [
  { to: '/dashboard/settings', label: 'nav.settings', icon: Settings, exact: false, soon: false },
]

function DashboardLayout() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { data: company, isLoading } = useMyCompany()
  const signOut = useSignOut()

  const handleSignOut = () => {
    signOut.mutate(undefined, {
      onSettled: () => navigate({ to: '/auth/sign-in' }),
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const allNav = [
    ...NAV,
    ...NAV_SYSTEM,
  ]
  const activeLabel = (() => {
    const match = allNav.find((n) => n.exact ? pathname === n.to : pathname.startsWith(n.to))
    return match ? t(`dashboard.${match.label}`) : 'Dashboard'
  })()

  return (
    <SidebarProvider>
      <Sidebar>
        {/* Logo */}
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/dashboard">
                  {company?.logo ? (
                    <img src={company.logo} alt="logo" className="size-8 rounded-lg object-cover" />
                  ) : (
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                      {company?.title?.[0] ?? 'I'}
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold truncate max-w-[120px]">
                      {company?.title ?? 'Iteam'}
                    </span>
                    <span className="text-xs text-muted-foreground">Dashboard</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t('dashboard.nav.main')}</SidebarGroupLabel>
            <SidebarMenu>
              {NAV.map((item) => {
                const locked = item.requiresCompany && !company
                const active = !locked && (
                  item.exact ? pathname === item.to : pathname.startsWith(item.to)
                );

                return (
                  <SidebarMenuItem key={item.to}>
                    {!locked ? (
                      <SidebarMenuButton asChild isActive={active}>
                        <Link to={item.to}>
                          <item.icon />
                          {t(`dashboard.${item.label}`)}
                        </Link>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        disabled
                        className="justify-between"
                        title={t('dashboard.nav.requiresCompany')}
                      >
                        <span className="flex items-center gap-2">
                          <item.icon />
                          {t(`dashboard.${item.label}`)}
                        </span>
                        <Lock className="size-3 text-muted-foreground" />
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>{t('dashboard.nav.system')}</SidebarGroupLabel>
            <SidebarMenu>
              {NAV_SYSTEM.map((item) => {
                const active = pathname.startsWith(item.to)
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.to}>
                        <item.icon />
                        {t(`dashboard.${item.label}`)}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center justify-between px-2 py-1">
                <Button variant="ghost" size="sm" className="text-xs font-medium uppercase h-7 px-2"
                  onClick={toggleLanguage}>
                  {i18n.language === 'en' ? 'UA' : 'EN'}
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground h-7 px-2"
                  onClick={handleSignOut}>
                  <LogOut className="size-4" />
                  <span className="text-xs">{t('dashboard.signOut')}</span>
                </Button>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b border-border px-4">
          <span className="text-sm font-medium flex-1 select-none">{activeLabel}</span>
          <NotificationBell />
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}

// ── Notification bell ─────────────────────────────────────────────────────────

function NotificationBell() {
  const { t } = useTranslation()
  const { data: countData } = useUnreadCount()
  const { data: notifications = [] } = useNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const count = countData?.count ?? 0

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Bell className="size-4" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border border-border bg-popover shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-medium">{t('notifications.title')}</p>
            {count > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="size-3.5" />
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('notifications.empty')}</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { if (!n.read) markRead.mutate(n.id) }}
                  className={`w-full text-left px-4 py-3 transition-colors hover:bg-muted/50 ${n.read ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    )}
                    <div className={!n.read ? '' : 'pl-4'}>
                      <p className="text-xs font-medium">{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(n.createdAt).toLocaleDateString('uk-UA', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
