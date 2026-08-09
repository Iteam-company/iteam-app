import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { Loader2, Mail, UserPlus } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { useInviteUsers } from '#/lib/company/mutations'

export function InviteModal({ smtpConfigured }: { smtpConfigured: boolean }) {
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
