import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft, ChevronRight, Loader2, Search, ShieldCheck, User, Users,
} from 'lucide-react'
import { Card, CardContent } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { FilterBar } from '#/components/team/FilterBar'
import { InviteModal } from '#/components/team/InviteModal'
import { MemberRow } from '#/components/team/MemberRow'
import { MetricCard } from '#/components/team/MetricCard'
import { useMe } from '#/lib/auth/mutations'
import {
  useCompanyMembers, useCompanyRoles, useCompanySettings,
} from '#/lib/company/mutations'
import type { MembersQuery } from '#/lib/company/types'

export const Route = createFileRoute('/dashboard/team')({ component: TeamPage, ssr: false })

const LIMIT = 10

function TeamPage() {
  const { t } = useTranslation()
  const { data: me } = useMe()
  const { data: roles } = useCompanyRoles()
  const { data: settings } = useCompanySettings()
  const isAdmin = me?.companyRole?.permissions.includes('ADMIN') ?? false
  const smtpConfigured = !!(settings?.smtpHost && settings?.smtpUser && settings?.smtpPassword)

  // ── Filter / pagination state ────────────────────────────────────────────
  const [query, setQuery] = useState<MembersQuery>({ page: 1, limit: LIMIT })
  const [searchInput, setSearchInput] = useState('')

  // Debounce search — fires 300 ms after the user stops typing
  useEffect(() => {
    const id = setTimeout(() => {
      setQuery((q) => ({ ...q, search: searchInput.trim() || undefined, page: 1 }))
    }, 300)
    return () => clearTimeout(id)
  }, [searchInput])

  const { data, isLoading, isFetching, error } = useCompanyMembers(query)
  const members = data?.data ?? []
  const meta = data?.meta

  const setPage = (page: number) => setQuery((q) => ({ ...q, page }))
  const setOccupation = (occupation: string | undefined) =>
    setQuery((q) => ({ ...q, occupation, page: 1 }))

  const adminCount = members.filter((m) => m.companyRole?.permissions.includes('ADMIN')).length
  const occupationList = roles ?? []

  return (
    <main className="flex flex-col gap-6 p-6">
      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          icon={<Users className="size-5 text-muted-foreground" />}
          value={meta?.total ?? 0}
          label={t('dashboard.team.members')}
        />
        <MetricCard
          icon={<ShieldCheck className="size-5 text-muted-foreground" />}
          value={adminCount}
          label={t('dashboard.team.admins')}
        />
        <MetricCard
          icon={<User className="size-5 text-muted-foreground" />}
          value={roles?.length ?? 0}
          label={t('dashboard.team.roles')}
        />
      </div>

      {/* Table card */}
      <Card>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <FilterBar
            occupations={occupationList}
            activeOccupation={query.occupation}
            onOccupationChange={setOccupation}
          />

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('dashboard.team.searchPlaceholder')}
                className="h-8 w-48 pl-8 text-sm"
              />
            </div>
            {isAdmin && <InviteModal smtpConfigured={smtpConfigured} />}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </CardContent>
        ) : error ? (
          <CardContent className="flex items-center justify-center py-12 text-sm text-destructive">
            {(error).message}
          </CardContent>
        ) : !members.length ? (
          <CardContent className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            {t('dashboard.team.noMembers')}
          </CardContent>
        ) : (
          <div className={isFetching ? 'opacity-60 transition-opacity' : ''}>
            {/* Header */}
            <div className={`grid items-center gap-4 px-6 py-2 text-xs font-medium text-muted-foreground ${isAdmin ? 'grid-cols-[1fr_180px_140px_160px_40px]' : 'grid-cols-[1fr_180px_160px]'}`}>
              <span>{t('dashboard.settings.name')}</span>
              <span>{t('dashboard.settings.occupation')}</span>
              {isAdmin && <span>{t('dashboard.team.salary')}</span>}
              <span>{t('dashboard.settings.role')}</span>
              {isAdmin && <span />}
            </div>
            <div className="divide-y divide-border">
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  isAdmin={isAdmin}
                  isSelf={member.id === me?.id}
                  companyRoles={occupationList}
                />
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-3">
            <p className="text-xs text-muted-foreground">
              {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)}{' '}
              / {meta.total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="icon" className="size-7"
                disabled={!meta.hasPrevious}
                onClick={() => setPage(meta.page - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`flex size-7 items-center justify-center rounded-md text-xs font-medium transition-colors ${
                    p === meta.page
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {p}
                </button>
              ))}
              <Button
                variant="ghost" size="icon" className="size-7"
                disabled={!meta.hasNext}
                onClick={() => setPage(meta.page + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </main>
  )
}
