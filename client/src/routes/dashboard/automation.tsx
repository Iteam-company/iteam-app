import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Mail,
  MessageSquare,
  Bell,
  Plus,
  Play,
  Pause,
  Trash2,
  FileText,
  ChevronRight,
  Zap,
  AlertTriangle,
  Loader2,
  CheckSquare,
  Square,
  SendHorizonal,
} from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Label } from '#/components/ui/label'
import { useCompanyMembers, useCompanySettings, useSendMessage } from '#/lib/company/mutations'

export const Route = createFileRoute('/dashboard/automation')({ component: AutomationPage, ssr: false })

// ── Mock data ──────────────────────────────────────────────────────────────────

type WorkflowStatus = 'active' | 'paused' | 'draft'

const WORKFLOWS = [
  {
    id: 1,
    name: 'Нагадування щодо ЄСВ',
    trigger: 'Щомісяця, 18-го числа',
    channel: 'email',
    recipients: 3,
    status: 'active' as WorkflowStatus,
    lastRun: '18.03.2025',
    opens: 87,
  },
  {
    id: 2,
    name: 'Check-in під час тривоги',
    trigger: 'Повітряна тривога (webhook)',
    channel: 'telegram',
    recipients: 6,
    status: 'active' as WorkflowStatus,
    lastRun: '14.04.2025',
    opens: 100,
  },
  {
    id: 3,
    name: 'Щотижневий дайджест команди',
    trigger: 'Щопонеділка, 09:00',
    channel: 'email',
    recipients: 6,
    status: 'paused' as WorkflowStatus,
    lastRun: '07.04.2025',
    opens: 62,
  },
  {
    id: 4,
    name: 'Вітання нового співробітника',
    trigger: 'Новий контракт підписано',
    channel: 'email',
    recipients: 1,
    status: 'draft' as WorkflowStatus,
    lastRun: '—',
    opens: 0,
  },
]

const TEMPLATES = [
  {
    id: 1,
    name: 'Нагадування ФОП (ЄСВ)',
    category: 'tax',
    preview: 'Шановний {{name}}, нагадуємо, що до {{date}} необхідно сплатити ЄСВ у розмірі {{amount}} грн.',
  },
  {
    id: 2,
    name: 'Оголошення для команди',
    category: 'internal',
    preview: 'Команда {{company}}, маємо важливе оголошення: {{message}}',
  },
  {
    id: 3,
    name: 'Check-in під час тривоги',
    category: 'safety',
    preview: '{{name}}, ви в безпеці? Будь ласка, підтвердіть свій статус: ✅ Так / ⚠️ Потрібна допомога',
  },
  {
    id: 4,
    name: 'Акт надання послуг',
    category: 'legal',
    preview: 'Відповідно до договору №{{contract}}, просимо підписати Акт надання послуг за {{month}}.',
  },
  {
    id: 5,
    name: 'Зарплатна квитанція',
    category: 'finance',
    preview: 'Нараховано за {{month}}: оклад {{salary}} грн, бонус {{bonus}} грн, утримання {{deduction}} грн.',
  },
]

const CHANNEL_ICON: Record<string, React.ElementType> = {
  email: Mail,
  telegram: MessageSquare,
  push: Bell,
}

const STATUS_BADGE: Record<WorkflowStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  active:  { label: 'automation.active',  variant: 'default'   },
  paused:  { label: 'automation.paused',  variant: 'secondary' },
  draft:   { label: 'automation.draft',   variant: 'outline'   },
}

const CATEGORY_COLOR: Record<string, string> = {
  tax:      'bg-amber-500/10 text-amber-600',
  internal: 'bg-blue-500/10 text-blue-600',
  safety:   'bg-destructive/10 text-destructive',
  legal:    'bg-primary/10 text-primary',
  finance:  'bg-green-500/10 text-green-600',
}

function WorkflowRow({
  wf,
  onToggle,
}: {
  wf: typeof WORKFLOWS[number]
  onToggle: (id: number) => void
}) {
  const { t } = useTranslation()
  const ChanIcon = CHANNEL_ICON[wf.channel] ?? Mail
  const badge = STATUS_BADGE[wf.status]

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <ChanIcon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{wf.name}</p>
        <p className="text-xs text-muted-foreground">{wf.trigger}</p>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-xs text-muted-foreground">{t('dashboard.automation.recipients')}</p>
        <p className="text-sm font-medium">{wf.recipients}</p>
      </div>
      <div className="hidden shrink-0 text-right md:block">
        <p className="text-xs text-muted-foreground">{t('dashboard.automation.lastRun')}</p>
        <p className="text-sm font-medium">{wf.lastRun}</p>
      </div>
      {wf.status !== 'draft' && (
        <div className="hidden shrink-0 text-right lg:block">
          <p className="text-xs text-muted-foreground">{t('dashboard.automation.openRate')}</p>
          <p className="text-sm font-medium">{wf.opens}%</p>
        </div>
      )}
      <Badge variant={badge.variant} className="shrink-0 text-xs">
        {t(`dashboard.${badge.label}`)}
      </Badge>
      <div className="flex shrink-0 gap-1">
        {wf.status !== 'draft' && (
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => onToggle(wf.id)}
            title={wf.status === 'active' ? t('dashboard.automation.pause') : t('dashboard.automation.resume')}
          >
            {wf.status === 'active'
              ? <Pause className="size-3.5" />
              : <Play className="size-3.5" />}
          </Button>
        )}
        <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive" title={t('dashboard.automation.delete')}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── Mail composer ──────────────────────────────────────────────────────────────

function MailComposer() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: settings, isLoading: settingsLoading } = useCompanySettings()
  const { data: membersPage, isLoading: membersLoading } = useCompanyMembers({ limit: 200 })
  const sendMessage = useSendMessage()

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [result, setResult] = useState<{ sent: number; failed: number; total: number; errors?: string[] } | null>(null)

  const smtpConfigured = !!(settings?.smtpHost && settings?.smtpUser && settings?.smtpPassword)
  const members = membersPage?.data ?? []

  // select all by default once members load
  useEffect(() => {
    if (members.length > 0) {
      setSelected(new Set(members.map((m) => m.id)))
    }
  }, [membersPage])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q),
    )
  }, [members, search])

  const allFilteredSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.id))

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        filtered.forEach((m) => next.delete(m.id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        filtered.forEach((m) => next.add(m.id))
        return next
      })
    }
  }

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || selected.size === 0) return
    setResult(null)
    const res = await sendMessage.mutateAsync({
      subject: subject.trim(),
      body: body.trim(),
      userIds: Array.from(selected),
    })
    setResult(res)
    setSubject('')
    setBody('')
    setSelected(new Set())
  }

  if (settingsLoading || membersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* SMTP warning */}
      {!smtpConfigured && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-400/40 bg-amber-400/10 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {t('dashboard.automation.smtpWarning')}
            </p>
            <button
              className="text-left text-xs text-amber-600 underline underline-offset-2 dark:text-amber-500"
              onClick={() => navigate({ to: '/dashboard/settings' })}
            >
              {t('dashboard.automation.smtpWarningLink')}
            </button>
          </div>
        </div>
      )}

      {/* Send result */}
      {result && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${result.failed > 0 ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-400'}`}>
          <p>{t('dashboard.automation.sent', { sent: result.sent, failed: result.failed })}</p>
          {result.errors && result.errors.length > 0 && (
            <p className="mt-1 text-xs opacity-80">{result.errors[0]}</p>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Compose form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t('dashboard.automation.compose')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{t('dashboard.automation.subject')}</Label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('dashboard.automation.subjectPlaceholder')}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{t('dashboard.automation.body')}</Label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t('dashboard.automation.bodyPlaceholder')}
                rows={7}
                className="flex w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </CardContent>
        </Card>

        {/* Recipient selector */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">
                {t('dashboard.automation.selectRecipients')}
                <span className="ml-2 font-normal text-muted-foreground">({selected.size})</span>
              </CardTitle>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('dashboard.automation.searchMembers')}
                className="flex h-7 w-40 rounded-md border border-input bg-background px-2.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-72">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/60 backdrop-blur-sm">
                  <tr>
                    <th className="w-10 px-4 py-2 text-left">
                      <button onClick={toggleAll} className="flex items-center">
                        {allFilteredSelected
                          ? <CheckSquare className="size-3.5 text-primary" />
                          : <Square className="size-3.5 text-muted-foreground" />}
                      </button>
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{t('dashboard.settings.name')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{t('dashboard.settings.email')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{t('dashboard.settings.occupation')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-xs text-muted-foreground">
                        {t('dashboard.automation.noMembers')}
                      </td>
                    </tr>
                  )}
                  {filtered.map((m) => {
                    const isSelected = selected.has(m.id)
                    return (
                      <tr
                        key={m.id}
                        onClick={() => toggleOne(m.id)}
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                      >
                        <td className="px-4 py-2.5">
                          {isSelected
                            ? <CheckSquare className="size-3.5 text-primary" />
                            : <Square className="size-3.5 text-muted-foreground" />}
                        </td>
                        <td className="px-3 py-2.5 font-medium">{m.fullName}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{m.email}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{m.occupation ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Send button */}
      <div className="flex justify-end">
        <Button
          disabled={
            !smtpConfigured ||
            !subject.trim() ||
            !body.trim() ||
            selected.size === 0 ||
            sendMessage.isPending
          }
          onClick={handleSend}
          className="gap-2"
        >
          {sendMessage.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <SendHorizonal className="size-4" />
          )}
          {sendMessage.isPending
            ? t('dashboard.automation.sending')
            : t('dashboard.automation.sendTo', { count: selected.size })}
        </Button>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

function AutomationPage() {
  const { t } = useTranslation()
  const [workflows, setWorkflows] = useState(WORKFLOWS)

  const toggleWorkflow = (id: number) => {
    setWorkflows((prev) =>
      prev.map((w) =>
        w.id === id
          ? { ...w, status: (w.status === 'active' ? 'paused' : 'active') as WorkflowStatus }
          : w,
      ),
    )
  }

  const active = workflows.filter((w) => w.status === 'active').length
  const totalSent = 1248

  return (
    <main className="flex flex-col gap-6 p-6">
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('dashboard.automation.activeWorkflows')}</CardDescription>
            <CardTitle className="text-3xl">{active}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{t('dashboard.automation.ofTotal', { total: workflows.length })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('dashboard.automation.sentThisMonth')}</CardDescription>
            <CardTitle className="text-3xl">{totalSent.toLocaleString('uk-UA')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{t('dashboard.automation.acrossChannels')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('dashboard.automation.avgOpen')}</CardDescription>
            <CardTitle className="text-3xl">78%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{t('dashboard.automation.vsLastMonth')}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="send-email">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="send-email">
              <Mail className="mr-1.5 size-3.5" />
              {t('dashboard.automation.sendEmail')}
            </TabsTrigger>
            <TabsTrigger value="workflows">
              <Zap className="mr-1.5 size-3.5" />
              {t('dashboard.automation.workflows')}
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileText className="mr-1.5 size-3.5" />
              {t('dashboard.automation.templates')}
            </TabsTrigger>
          </TabsList>
          <Button size="sm" className="gap-1.5">
            <Plus className="size-3.5" />
            {t('dashboard.automation.newWorkflow')}
          </Button>
        </div>

        {/* Send email tab */}
        <TabsContent value="send-email" className="mt-4">
          <MailComposer />
        </TabsContent>

        {/* Workflows tab */}
        <TabsContent value="workflows" className="mt-4 flex flex-col gap-3">
          {workflows.map((wf) => (
            <WorkflowRow key={wf.id} wf={wf} onToggle={toggleWorkflow} />
          ))}
        </TabsContent>

        {/* Templates tab */}
        <TabsContent value="templates" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.map((tpl) => (
              <Card key={tpl.id} className="cursor-pointer hover:border-muted-foreground/30 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm">{tpl.name}</CardTitle>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORY_COLOR[tpl.category]}`}>
                      {t(`dashboard.automation.category.${tpl.category}`)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-3 text-xs text-muted-foreground">{tpl.preview}</p>
                  <Button variant="ghost" size="sm" className="mt-3 h-7 w-full gap-1 text-xs">
                    {t('dashboard.automation.useTemplate')}
                    <ChevronRight className="size-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </main>
  )
}
