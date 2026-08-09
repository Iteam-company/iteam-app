import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { useYearData } from '#/lib/workdays/mutations'
import {
  addDays, formatMonthYear, formatWeekRange, startOfWeek, toKey, todayUTC, utcDay,
} from './date-utils'
import { STATUS_LABEL_KEY, STATUS_ORDER, STATUS_SOLID } from './status-styles'
import { buildDayMaps } from './view-model'
import { LEVELS, MONTH, WEEK, YEAR,  useZoomLayers, usePinchZoom } from './zoom'
import type {Level} from './zoom';
import { YearView } from './YearView'
import { MonthView } from './MonthView'
import { WeekView } from './WeekView'
import { DayModal } from './DayModal'

export function ZoomCalendar({
  anchor, setAnchor,
}: {
  anchor: Date
  setAnchor: React.Dispatch<React.SetStateAction<Date>>
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'uk' ? 'uk-UA' : 'en-US'

  const containerRef = useRef<HTMLDivElement | null>(null)
  const ctl = useZoomLayers(MONTH)
  const { layerRefs, level, snap } = ctl
  usePinchZoom(containerRef, ctl)

  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const year = anchor.getUTCFullYear()
  const month = anchor.getUTCMonth() + 1
  const weekStart = startOfWeek(anchor)
  const weekEnd = addDays(weekStart, 6)
  const weekEndYear = weekEnd.getUTCFullYear()

  // One request covers every day of the year, so all three views share it.
  // A week straddling New Year needs the neighbour too — that's the only case
  // where a second request happens.
  const yearQ = useYearData(year)
  const nextYearQ = useYearData(weekEndYear, weekEndYear !== year)

  const maps = useMemo(
    () => buildDayMaps([yearQ.data, nextYearQ.data]),
    [yearQ.data, nextYearQ.data],
  )

  const todayKey = toKey(todayUTC().toISOString())

  // Prev/next steps by whatever unit is currently in focus.
  const step = (dir: 1 | -1) => {
    setAnchor((prev) => {
      if (level === YEAR)  return utcDay(prev.getUTCFullYear() + dir, prev.getUTCMonth() + 1, 1)
      if (level === MONTH) return utcDay(prev.getUTCFullYear(), prev.getUTCMonth() + 1 + dir, 1)
      return addDays(prev, dir * 7)
    })
  }

  const title = level === YEAR
    ? String(year)
    : level === MONTH
      ? formatMonthYear(year, month, locale)
      : formatWeekRange(weekStart, locale)

  const zoomLabels: { level: Level; label: string }[] = [
    { level: YEAR,  label: t('schedule.year') },
    { level: MONTH, label: t('schedule.month') },
    { level: WEEK,  label: t('schedule.week') },
  ]

  const selKey     = selectedDate ? toKey(selectedDate.toISOString()) : null
  const selWorkDay = selKey ? maps.workDayMap.get(selKey) : undefined

  const viewProps = { maps, todayKey, locale, onSelectDay: setSelectedDate }

  return (
    <>
      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="shrink-0 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium">{t('me.schedule')}</CardTitle>

            <div className="flex items-center gap-2">
              {/* Explicit control — pinch is invisible and not keyboard-reachable */}
              <div className="flex rounded-lg bg-muted p-0.5">
                {zoomLabels.map((z) => (
                  <button
                    key={z.level}
                    onClick={() => snap(z.level)}
                    aria-pressed={level === z.level}
                    className={[
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                      level === z.level
                        ? 'bg-background shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    ].join(' ')}
                  >
                    {z.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="size-7" onClick={() => step(-1)}>
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="min-w-32.5 text-center text-sm font-medium">{title}</span>
                <Button variant="ghost" size="icon" className="size-7" onClick={() => step(1)}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col pb-4">
          {/*
            touch-none keeps the browser from pinch-zooming the page out from
            under us. All three layers stay mounted and are cross-faded by
            `paint()` writing styles directly — React never re-renders them
            mid-gesture, which is what keeps the transition at frame rate.
          */}
          <div ref={containerRef} className="relative min-h-0 flex-1 touch-none overflow-hidden">
            {LEVELS.map((lvl) => (
              <div
                key={lvl}
                ref={(el) => { layerRefs.current[lvl] = el }}
                aria-hidden={level !== lvl}
                className="absolute inset-0 origin-center will-change-[transform,opacity]"
              >
                {lvl === YEAR && (
                  <YearView year={year} {...viewProps} />
                )}
                {lvl === MONTH && (
                  <MonthView year={year} month={month} {...viewProps} />
                )}
                {lvl === WEEK && (
                  <WeekView weekStart={weekStart} {...viewProps} />
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-3 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3">
            {STATUS_ORDER.map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className={`inline-block size-2.5 rounded-[22%] ${STATUS_SOLID[s]}`} />
                <span className="text-[11px] text-muted-foreground">{t(STATUS_LABEL_KEY[s])}</span>
              </span>
            ))}
            <span className="ml-auto hidden text-[11px] text-muted-foreground sm:inline">
              {t('schedule.pinchHint')}
            </span>
          </div>
        </CardContent>
      </Card>

      {selectedDate && (
        <DayModal
          open
          onClose={() => setSelectedDate(null)}
          date={selectedDate}
          workDay={selWorkDay}
        />
      )}
    </>
  )
}
