import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle, CheckSquare, Loader2, SendHorizonal, Square,
} from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Label } from '#/components/ui/label'
import { useCompanyMembers, useCompanySettings, useSendMessage } from '#/lib/company/mutations'

export function MailComposer() {
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
