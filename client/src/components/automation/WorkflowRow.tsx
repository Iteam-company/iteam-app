import { useTranslation } from 'react-i18next'
import { Mail, Pause, Play, Trash2 } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import type { WORKFLOWS } from './mock-data';
import { CHANNEL_ICON, STATUS_BADGE } from './mock-data'

export function WorkflowRow({
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
