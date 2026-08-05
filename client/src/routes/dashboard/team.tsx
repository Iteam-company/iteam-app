import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronDown, ChevronLeft, ChevronRight, Loader2, Mail,
  Search, ShieldCheck, Trash2, User, UserPlus, Users,
} from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '#/components/ui/select'
import { useMe } from '#/lib/auth/mutations'
import {
  useCompanyMembers,
  useCompanyRoles,
  useCompanySettings,
  useInviteUsers,
  useRemoveMember,
  useUpdateMemberOccupation,
  useUpdateMemberRole,
  useUpdateMemberSalary,
} from '#/lib/company/mutations'
import type { CompanyMember, MembersQuery } from '#/lib/company/types'

export const Route = createFileRoute('/dashboard/team')({ component: TeamPage, ssr: false })

const LIMIT = 10

function TeamPage() {
  const { t } = useTranslation()
  const { data: me } = useMe()
  const { data: roles } = useCompanyRoles()
  const { data: settings } = useCompanySettings()
  const isAdmin = me?.role === 'ADMIN'
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

  const adminCount = members.filter((m) => m.role === 'ADMIN').length
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
            {(error as Error).message}
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
                  occupations={occupationList}
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

// ── Filter bar ────────────────────────────────────────────────────────────────

const PILL_LIMIT = 4

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    >
      {children}
    </button>
  )
}

function FilterBar({
  occupations,
  activeOccupation,
  onOccupationChange,
}: {
  occupations: import('#/lib/company/types').CompanyRole[]
  activeOccupation?: string
  onOccupationChange: (v: string | undefined) => void
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const visible = expanded ? occupations : occupations.slice(0, PILL_LIMIT)
  const hidden = occupations.length - PILL_LIMIT
  // Always show the active pill even when collapsed
  const activeIsHidden =
    !expanded &&
    activeOccupation !== undefined &&
    !occupations.slice(0, PILL_LIMIT).some((r) => r.name === activeOccupation)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterPill active={!activeOccupation} onClick={() => onOccupationChange(undefined)}>
        {t('dashboard.team.filterAll')}
      </FilterPill>

      {visible.map((r) => (
        <FilterPill
          key={r.id}
          active={activeOccupation === r.name}
          onClick={() => onOccupationChange(r.name)}
        >
          {r.name}
        </FilterPill>
      ))}

      {/* Show active pill when it's hidden in collapsed state */}
      {activeIsHidden && (
        <FilterPill active onClick={() => onOccupationChange(activeOccupation)}>
          {activeOccupation}
        </FilterPill>
      )}

      {hidden > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground bg-muted hover:bg-muted/80 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronDown className="size-3 rotate-180" />
              {t('dashboard.team.showLess')}
            </>
          ) : (
            <>
              <ChevronDown className="size-3" />
              {`+${hidden}`}
            </>
          )}
        </button>
      )}
    </div>
  )
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Member row ────────────────────────────────────────────────────────────────

function MemberRow({ member, isAdmin, isSelf, occupations }: {
  member: CompanyMember
  isAdmin: boolean
  isSelf: boolean
  occupations: import('#/lib/company/types').CompanyRole[]
}) {
  const { t } = useTranslation()
  const updateRole = useUpdateMemberRole()
  const updateOccupation = useUpdateMemberOccupation()
  const updateSalary = useUpdateMemberSalary()
  const removeMember = useRemoveMember()
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [salaryEditing, setSalaryEditing] = useState(false)
  const [salaryDraft, setSalaryDraft] = useState('')

  const startSalaryEdit = () => {
    setSalaryDraft(member.salary != null ? String(member.salary) : '')
    setSalaryEditing(true)
  }

  const commitSalary = () => {
    setSalaryEditing(false)
    const parsed = salaryDraft.trim() === '' ? null : Number(salaryDraft)
    if (!isNaN(parsed as number) && parsed !== member.salary) {
      updateSalary.mutate({ id: member.id, salary: parsed })
    }
  }

  const handleRemove = async () => {
    setRemoving(true)
    try {
      await removeMember.mutateAsync(member.id)
      setRemoveOpen(false)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className={`grid items-center gap-4 px-6 py-3 ${isAdmin ? 'grid-cols-[1fr_180px_140px_160px_40px]' : 'grid-cols-[1fr_180px_160px]'}`}>
      {/* Name + email */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          {member.fullName[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {member.fullName}
            {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
        </div>
      </div>

      {/* Occupation */}
      <div>
        {isAdmin ? (
          <Select
            value={member.occupation ?? '__none__'}
            onValueChange={(v) =>
              updateOccupation.mutate({ id: member.id, occupation: v === '__none__' ? '' : v })
            }
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {occupations.map((r) => (
                <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          member.occupation
            ? <Badge variant="secondary" className="text-xs font-normal">{member.occupation}</Badge>
            : <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {/* Salary — admin only */}
      {isAdmin && (
        <div>
          {salaryEditing ? (
            <Input
              autoFocus
              type="number"
              min={0}
              value={salaryDraft}
              onChange={(e) => setSalaryDraft(e.target.value)}
              onBlur={commitSalary}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitSalary()
                if (e.key === 'Escape') setSalaryEditing(false)
              }}
              className="h-7 w-full text-xs"
            />
          ) : (
            <button
              onClick={startSalaryEdit}
              className="w-full rounded px-2 py-1 text-left text-xs hover:bg-muted transition-colors"
            >
              {member.salary != null
                ? Number(member.salary).toLocaleString('uk-UA') + ' ₴'
                : <span className="text-muted-foreground">—</span>}
            </button>
          )}
        </div>
      )}

      {/* Role */}
      <div>
        {isAdmin && !isSelf ? (
          <Select
            value={member.role}
            onValueChange={(v) => updateRole.mutate({ id: member.id, role: v as 'USER' | 'ADMIN' })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USER">User</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant={member.role === 'ADMIN' ? 'default' : 'secondary'} className="text-xs">
            {member.role === 'ADMIN'
              ? <><ShieldCheck className="mr-1 size-3" />Admin</>
              : <><User className="mr-1 size-3" />User</>}
          </Badge>
        )}
      </div>

      {/* Remove */}
      <div>
        {isAdmin && !isSelf ? (
          <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive">
                <Trash2 className="size-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{t('dashboard.team.removeConfirm')}</DialogTitle>
                <DialogDescription>
                  {t('dashboard.team.removeDesc', { name: member.fullName })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setRemoveOpen(false)}>
                  {t('dashboard.team.cancel')}
                </Button>
                <Button variant="destructive" onClick={handleRemove} disabled={removing}>
                  {removing ? <Loader2 className="size-4 animate-spin" /> : t('dashboard.team.remove')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : <div className="size-7" />}
      </div>
    </div>
  )
}

// ── Invite modal ──────────────────────────────────────────────────────────────

function InviteModal({ smtpConfigured }: { smtpConfigured: boolean }) {
  const { t } = useTranslation()
  const inviteUsers = useInviteUsers()
  const [open, setOpen] = useState(false)
  const [emails, setEmails] = useState('')
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResult(null)
    const list = emails.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean)
    if (!list.length) return
    try {
      await inviteUsers.mutateAsync({ emails: list })
      setResult({ success: t('dashboard.team.inviteSuccess') })
      setEmails('')
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : t('auth.error') })
    }
  }

  const handleOpenChange = (v: boolean) => {
    setOpen(v)
    if (!v) { setEmails(''); setResult(null) }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 h-8">
          <UserPlus className="size-3.5" />
          {t('dashboard.team.invite')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="size-4" />
            {t('dashboard.team.invite')}
          </DialogTitle>
          <DialogDescription>{t('dashboard.team.inviteDesc')}</DialogDescription>
        </DialogHeader>

        {!smtpConfigured ? (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {t('dashboard.team.inviteSmtpMissing')}{' '}
            <Link to="/dashboard/company" className="underline underline-offset-2">
              {t('dashboard.settings.company')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {result?.success && (
              <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{result.success}</p>
            )}
            {result?.error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{result.error}</p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-emails">{t('dashboard.team.inviteEmail')}</Label>
              <textarea
                id="invite-emails"
                rows={3}
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder={t('dashboard.team.inviteEmailPlaceholder')}
                className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p className="text-xs text-muted-foreground">{t('dashboard.team.inviteMultiHint')}</p>
            </div>
            <DialogFooter>
              <Button type="submit" className="gap-2" disabled={inviteUsers.isPending || !emails.trim()}>
                {inviteUsers.isPending
                  ? <><Loader2 className="size-4 animate-spin" />{t('dashboard.team.inviteSending')}</>
                  : t('dashboard.team.inviteSend')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
