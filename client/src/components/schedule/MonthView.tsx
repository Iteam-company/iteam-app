import { daysInMonthOf, dowIndex, getDowLabel, utcDay } from './date-utils'
import { STATUS_BG } from './status-styles'
import { resolveDay  } from './view-model'
import type {ViewProps} from './view-model';

export function MonthView({
  year, month, maps, todayKey, locale, onSelectDay,
}: ViewProps & { year: number; month: number }) {
  const total = daysInMonthOf(year, month)
  const startDow = dowIndex(utcDay(year, month, 1))
  const numRows = Math.ceil((startDow + total) / 7)

  const dowLabels = Array.from({ length: 7 }, (_, i) => getDowLabel(i, locale, 'short'))

  return (
    <div className="flex h-full flex-col">
      <div className="grid shrink-0 grid-cols-7">
        {dowLabels.map((d) => (
          <div key={d} className="py-1 text-center text-[11px] font-medium capitalize text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      <div
        className="grid min-h-0 flex-1 grid-cols-7 gap-1"
        style={{ gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: startDow }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {Array.from({ length: total }, (_, i) => i + 1).map((day) => {
          const date = utcDay(year, month, day)
          const { key, status, confirmed } = resolveDay(date, maps)
          const isToday = key === todayKey

          return (
            <button
              key={key}
              onClick={() => onSelectDay(date)}
              className={[
                'flex flex-col items-center justify-center gap-1 rounded-lg text-xs transition-colors',
                confirmed ? STATUS_BG[status!] : 'hover:bg-muted/50',
                isToday ? 'ring-1 ring-primary' : 'hover:ring-1 hover:ring-border',
              ].join(' ')}
            >
              <span className={`text-base font-semibold leading-none ${isToday ? 'text-primary' : ''}`}>
                {day}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
