import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Pencil, X } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '#/components/ui/select'
import { useRemoveWorkDay, useUpsertWorkDay } from '#/lib/workdays/mutations'
import type { WorkDay, WorkDayStatus } from '#/lib/workdays/types'
import { formatDayTitle, toKey } from './date-utils'
import { STATUS_BADGE, STATUS_LABEL_KEY, STATUS_ORDER } from './status-styles'

// Kept deliberately simple: pick one of the six exception statuses, or clear
// the day back to a regular working day. Per-day start/end time entry used to
// live here — it depended on WorkDay.startTime/endTime, which the backend
// dropped in the work-day status rework. Time logging will get its own flow
// once the WorkTimeEntry endpoint exists (see server/prisma/schema.prisma);
// nothing here should try to rebuild it in the meantime.

interface DayModalProps {
  open: boolean
  onClose: () => void
  date: Date
  workDay: WorkDay | undefined
}

export function DayModal({ open, onClose, date, workDay }: DayModalProps) {
  const { t, i18n } = useTranslation()
  const upsert = useUpsertWorkDay()
  const removeDay = useRemoveWorkDay()
  const locale = i18n.language === 'uk' ? 'uk-UA' : 'en-US'

  const [editing, setEditing] = useState(!workDay)
  const [status, setStatus] = useState<WorkDayStatus>(workDay?.status ?? STATUS_ORDER[0])

  // Sync when the selected day changes
  useEffect(() => {
    setEditing(!workDay)
    setStatus(workDay?.status ?? STATUS_ORDER[0])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date.toISOString()])

  const handleSave = async () => {
    await upsert.mutateAsync({ date: toKey(date.toISOString()), status })
    setEditing(false)
    if (!workDay) onClose()
  }

  const handleClear = async () => {
    await removeDay.mutateAsync(toKey(date.toISOString()))
    onClose()
  }

  const busy = upsert.isPending || removeDay.isPending

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-base font-semibold">
              {formatDayTitle(date, locale)}
            </DialogTitle>
            {!editing && (
              <Button
                variant="ghost" size="icon" className="size-7 shrink-0"
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-3.5" />
              </Button>
            )}
          </div>
        </DialogHeader>

        {editing ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{t('me.dayStatus')}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as WorkDayStatus)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>{t(STATUS_LABEL_KEY[s])}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              {workDay && (
                <Button
                  variant="outline" size="sm" className="mr-auto gap-1.5"
                  onClick={handleClear} disabled={busy}
                >
                  <X className="size-3.5" />
                  {t('me.clearStatus')}
                </Button>
              )}
              {workDay && (
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                  {t('dashboard.team.cancel')}
                </Button>
              )}
              <Button size="sm" onClick={handleSave} disabled={busy}>
                {upsert.isPending
                  ? <Loader2 className="size-3.5 animate-spin" />
                  : t('me.save')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[workDay!.status]}`}>
              {t(STATUS_LABEL_KEY[workDay!.status])}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
