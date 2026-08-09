import { useTranslation } from 'react-i18next'
import { addDays, dowIndex, getDowLabel } from './date-utils'
import { STATUS_BADGE, STATUS_BG, STATUS_LABEL_KEY } from './status-styles'
import { resolveDay  } from './view-model'
import type {ViewProps} from './view-model';

// A simple day-by-day agenda list. This used to be an hour-by-hour time grid
// built around WorkDay.startTime/endTime, but the backend dropped those
// fields in the work-day status rework — there's no per-day time range to
// plot anymore, only an exception status. Rebuild as a time grid once
// WorkTimeEntry (server/prisma/schema.prisma) has a real endpoint behind it.

export function WeekView({
  weekStart, maps, todayKey, locale, onSelectDay,
}: ViewProps & { weekStart: Date }) {
  const { t } = useTranslation()
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const resolved = days.map((d) => ({ date: d, ...resolveDay(d, maps) }))

  return (
    <div className="flex h-full flex-col gap-1.5 overflow-y-auto py-1">
      {resolved.map(({ date, key, status, confirmed }) => {
        const isToday = key === todayKey

        return (
          <button
            key={key}
            onClick={() => onSelectDay(date)}
            className={[
              'flex shrink-0 items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors',
              confirmed ? STATUS_BG[status!] : 'hover:bg-muted/50',
              isToday ? 'border-primary ring-1 ring-primary' : 'border-border',
            ].join(' ')}
          >
            <div className="flex items-center gap-3">
              <span
                className={[
                  'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                  isToday ? 'bg-primary text-primary-foreground' : 'bg-muted',
                ].join(' ')}
              >
                {date.getUTCDate()}
              </span>
              <span className="text-sm font-medium capitalize text-muted-foreground">
                {getDowLabel(dowIndex(date), locale, 'short')}
              </span>
            </div>
            {confirmed ? (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[status!]}`}>
                {t(STATUS_LABEL_KEY[status!])}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">{t('me.statusWorking')}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
