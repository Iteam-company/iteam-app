import { useLayoutEffect, useRef, useState } from 'react'
import { daysInMonthOf, formatDayTitle, formatMonthShort, utcDay } from './date-utils'
import { NEUTRAL_DOT, STATUS_SOLID } from './status-styles'
import { resolveDay  } from './view-model'
import type {ViewProps} from './view-model';

// The whole year as a matrix: one row per month, one column per day-of-month.
// At 31x12 (~2.6:1) it fits a wide, short layer far better than a 7x53 weekday
// band (~7.6:1), which had to be stretched and still left the area half empty.
// Dot size and spacing are derived from the measured container so the grid
// fills the space it is given.

/** Target gap as a fraction of the dot size, before spare space is shared out. */
const GAP_RATIO = 0.4
const MONTHS_IN_YEAR = 12
const MAX_DAYS_IN_MONTH = 31

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, size] as const
}

/** Left gutter for month labels, top strip for day-of-month numbers. */
const GUTTER_W = 46
const HEADER_H = 18

export function YearView({
  year, maps, todayKey, locale, onSelectDay,
}: ViewProps & { year: number }) {
  const [wrapRef, { w, h }] = useElementSize<HTMLDivElement>()

  // Whichever axis runs out first sets the dot size; the leftover space on the
  // other axis is then shared between the gaps.
  const gridW = Math.max(0, w - GUTTER_W)
  const gridH = Math.max(0, h - HEADER_H)
  const dot = Math.max(3, Math.floor(Math.min(
    gridW / (MAX_DAYS_IN_MONTH + (MAX_DAYS_IN_MONTH - 1) * GAP_RATIO),
    gridH / (MONTHS_IN_YEAR + (MONTHS_IN_YEAR - 1) * GAP_RATIO),
  )))
  const colGap = Math.max(0, (gridW - MAX_DAYS_IN_MONTH * dot) / (MAX_DAYS_IN_MONTH - 1))
  const rowGap = Math.max(0, (gridH - MONTHS_IN_YEAR * dot) / (MONTHS_IN_YEAR - 1))

  const months = Array.from({ length: MONTHS_IN_YEAR }, (_, i) => i + 1)
  const dayNumbers = Array.from({ length: MAX_DAYS_IN_MONTH }, (_, i) => i + 1)
  const cellColumns = `repeat(${MAX_DAYS_IN_MONTH}, ${dot}px)`

  return (
    <div ref={wrapRef} className="flex h-full w-full flex-col justify-center overflow-hidden">
      {w > 0 && (
        <>
          {/* Day-of-month axis */}
          <div className="flex shrink-0" style={{ height: HEADER_H }}>
            <div style={{ width: GUTTER_W }} />
            <div
              className="grid"
              style={{ gridTemplateColumns: cellColumns, columnGap: `${colGap}px` }}
            >
              {dayNumbers.map((day) => (
                <span
                  key={day}
                  className="text-center text-[10px] leading-none tabular-nums text-muted-foreground"
                >
                  {day}
                </span>
              ))}
            </div>
          </div>

          <div className="flex">
            {/* Month axis */}
            <div
              className="grid shrink-0"
              style={{
                width: GUTTER_W,
                gridTemplateRows: `repeat(${MONTHS_IN_YEAR}, ${dot}px)`,
                rowGap: `${rowGap}px`,
              }}
            >
              {months.map((month) => (
                <span
                  key={month}
                  className="flex items-center text-[10px] capitalize leading-none text-muted-foreground"
                >
                  {formatMonthShort(year, month, locale)}
                </span>
              ))}
            </div>

            {/* One row per month, one column per day-of-month. Short months
                simply leave their trailing cells empty. */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: cellColumns,
                gridTemplateRows: `repeat(${MONTHS_IN_YEAR}, ${dot}px)`,
                columnGap: `${colGap}px`,
                rowGap: `${rowGap}px`,
              }}
            >
              {months.map((month) => {
                const length = daysInMonthOf(year, month)

                return dayNumbers.map((day) => {
                  if (day > length) {
                    return <span key={`${month}-${day}`} style={{ width: dot, height: dot }} />
                  }

                  const date = utcDay(year, month, day)
                  const { key, status, confirmed } = resolveDay(date, maps)
                  const isToday = key === todayKey

                  return (
                    <button
                      key={key}
                      onClick={() => onSelectDay(date)}
                      title={formatDayTitle(date, locale)}
                      style={{ width: dot, height: dot }}
                      className={[
                        // Percentage radius, so the corner softens in step with
                        // whatever size the grid resolves the cell to.
                        'rounded-[22%] transition-transform hover:scale-125',
                        isToday
                          ? 'bg-primary ring-2 ring-primary/40'
                          : confirmed ? STATUS_SOLID[status!] : NEUTRAL_DOT,
                      ].join(' ')}
                    />
                  )
                })
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
