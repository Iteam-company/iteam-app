import { createFileRoute } from '@tanstack/react-router'
import { MessageCircle, Wifi, WifiOff, ShieldAlert, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/dashboard/')({
  component: CommandCenter,
  ssr: false,
})

// ── Mock data ──────────────────────────────────────────────────────────────────

type WorkerStatus = 'online' | 'no-power' | 'shelter'

const WORKERS = [
  { id: 1, name: 'Олена Ковальчук',  role: 'HR-спеціаліст',         status: 'online'    as WorkerStatus },
  { id: 2, name: 'Іван Мельник',     role: 'Розробник',             status: 'no-power'  as WorkerStatus },
  { id: 3, name: 'Марія Шевченко',   role: 'Дизайнер',              status: 'online'    as WorkerStatus },
  { id: 4, name: 'Петро Бондар',     role: 'Менеджер з продажів',   status: 'shelter'   as WorkerStatus },
  { id: 5, name: 'Наталія Яценко',   role: 'Маркетолог',            status: 'online'    as WorkerStatus },
  { id: 6, name: 'Олег Савченко',    role: 'CEO / Директор',        status: 'online'    as WorkerStatus },
]

const ALERTS = [
  { icon: ShieldAlert, color: 'text-destructive', text: 'alerts.contracts' },
  { icon: Zap,         color: 'text-amber-500',   text: 'alerts.okr' },
  { icon: Zap,         color: 'text-amber-500',   text: 'alerts.payouts' },
]

const STATUS_CONFIG: Record<WorkerStatus, { label: string; emoji: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  'online':   { label: 'status.online',   emoji: '🟢', variant: 'default'     },
  'no-power': { label: 'status.noPower',  emoji: '🟡', variant: 'secondary'   },
  'shelter':  { label: 'status.shelter',  emoji: '🔴', variant: 'destructive' },
}

function CommandCenter() {
  const { t } = useTranslation()

  const online = WORKERS.filter((w) => w.status === 'online').length
  const resiliency = Math.round((online / WORKERS.length) * 100)

  return (
    <main className="flex flex-col gap-6 p-6">
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('dashboard.command.totalWorkers')}</CardDescription>
            <CardTitle className="text-3xl">{WORKERS.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{t('dashboard.command.activeTeam')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('dashboard.command.resiliency')}</CardDescription>
            <CardTitle className="text-3xl">{resiliency}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${resiliency}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {online} / {WORKERS.length} {t('dashboard.command.withPower')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('dashboard.command.alerts')}</CardDescription>
            <CardTitle className="text-3xl">{ALERTS.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{t('dashboard.command.needAttention')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Team vitality grid */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">{t('dashboard.command.teamGrid')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {WORKERS.map((w) => {
              const cfg = STATUS_CONFIG[w.status]
              return (
                <Card key={w.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                      {w.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">{w.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{w.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={cfg.variant} className="text-xs">
                      {cfg.emoji} {t(`dashboard.${cfg.label}`)}
                    </Badge>
                    <Button variant="ghost" size="icon" className="size-7 shrink-0" title="Telegram ping">
                      <MessageCircle className="size-3.5" />
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Operational alerts */}
        <div>
          <h2 className="mb-3 text-sm font-semibold">{t('dashboard.command.operationalAlerts')}</h2>
          <Card>
            <CardContent className="flex flex-col divide-y divide-border pt-4">
              {ALERTS.map((a, i) => (
                <div key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <a.icon className={`mt-0.5 size-4 shrink-0 ${a.color}`} />
                  <p className="text-sm">{t(`dashboard.command.${a.text}`)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Power/internet widget */}
          <h2 className="mb-3 mt-5 text-sm font-semibold">{t('dashboard.command.connectivity')}</h2>
          <Card>
            <CardContent className="pt-4">
              {WORKERS.map((w) => (
                <div key={w.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-muted-foreground truncate">{w.name.split(' ')[0]}</span>
                  {w.status === 'online'
                    ? <Wifi className="size-4 text-primary" />
                    : w.status === 'no-power'
                    ? <WifiOff className="size-4 text-amber-500" />
                    : <WifiOff className="size-4 text-destructive" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
