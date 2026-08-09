import { createFileRoute } from '@tanstack/react-router'
import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Loader2, Pencil, X } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '#/components/ui/select'
import { useMonthData, useRemoveWorkDay, useUpsertWorkDay, useYearData } from '#/lib/workdays/mutations'
import type { MonthData, WorkDay, WorkDayStatus } from '#/lib/workdays/types'

export const Route = createFileRoute('/dashboard/schedule')({ component: SchedulePage, ssr: false })

// ── Date helpers ──────────────────────────────────────────────────────────────

function toKey(iso: string) { return iso.slice(0, 10) }

/** Every date in this file is built at UTC midnight, so read it back in UTC. */
function utcDay(year: number, month1: number, day: number) {
  return new Date(Date.UTC(year, month1 - 1, day))
}

function todayUTC() {
  const n = new Date()
  return utcDay(n.getFullYear(), n.getMonth() + 1, n.getDate())
}

/** Mon-based index: 0=Mon … 6=Sun */
function dowIndex(date: Date) {
  return (date.getUTCDay() + 6) % 7
}

function addDays(date: Date, n: number) {
  const d = new Date(date.getTime())
  d.setUTCDate(d.getUTCDate() + n)
  return d
}

/** Monday of the week containing `date`. */
function startOfWeek(date: Date) {
  return addDays(date, -dowIndex(date))
}

function daysInMonthOf(year: number, month1: number) {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate()
}

function getDowLabel(idx: number, locale: string, style: 'short' | 'narrow' = 'short') {
  // April 13, 2026 is a Monday — use it as reference
  return new Date(Date.UTC(2026, 3, 13 + idx))
    .toLocaleDateString(locale, { weekday: style, timeZone: 'UTC' })
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

function formatMonthYear(year: number, month: number, locale: string) {
  const name = utcDay(year, month, 1).toLocaleDateString(locale, { month: 'long', timeZone: 'UTC' })
  return capitalize(name) + ' ' + year
}

function formatMonthShort(year: number, month: number, locale: string) {
  return capitalize(
    utcDay(year, month, 1).toLocaleDateString(locale, { month: 'short', timeZone: 'UTC' }),
  )
}

function formatDayTitle(date: Date, locale: string) {
  return date.toLocaleDateString(locale, {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

/** "5 – 11 Aug 2026", collapsing the month when the week doesn't straddle one. */
function formatWeekRange(start: Date, locale: string) {
  const end = addDays(start, 6)
  const sameMonth = start.getUTCMonth() === end.getUTCMonth()
  const startLabel = start.toLocaleDateString(
    locale,
    sameMonth
      ? { day: 'numeric', timeZone: 'UTC' }
      : { day: 'numeric', month: 'short', timeZone: 'UTC' },
  )
  const endLabel = end.toLocaleDateString(locale, {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
  return `${startLabel} – ${endLabel}`
}

// ── Status styles ─────────────────────────────────────────────────────────────
//
// A date with no WorkDay record is an implicit regular working day — there is
// no "WORKING" status anymore, only exceptions. Colors below only apply to
// confirmed (recorded) exceptions; unmarked days render neutrally.

const STATUS_ORDER: WorkDayStatus[] = [
  'WEEKEND_PAID', 'WEEKEND_UNPAID',
  'SICK_LEAVE_PAID', 'SICK_LEAVE_UNPAID',
  'VACATION', 'HOLIDAY',
]

const STATUS_LABEL_KEY: Record<WorkDayStatus, string> = {
  WEEKEND_PAID: 'me.statusWeekendPaid',
  WEEKEND_UNPAID: 'me.statusWeekendUnpaid',
  SICK_LEAVE_PAID: 'me.statusSickLeavePaid',
  SICK_LEAVE_UNPAID: 'me.statusSickLeaveUnpaid',
  VACATION: 'me.statusVacation',
  HOLIDAY: 'me.statusHoliday',
}

const STATUS_BG: Record<WorkDayStatus, string> = {
  WEEKEND_PAID: 'bg-amber-400/25',
  WEEKEND_UNPAID: 'bg-amber-600/25',
  SICK_LEAVE_PAID: 'bg-rose-500/20',
  SICK_LEAVE_UNPAID: 'bg-rose-700/20',
  VACATION: 'bg-emerald-500/20',
  HOLIDAY: 'bg-violet-500/20',
}

const STATUS_SOLID: Record<WorkDayStatus, string> = {
  WEEKEND_PAID: 'bg-amber-400',
  WEEKEND_UNPAID: 'bg-amber-600',
  SICK_LEAVE_PAID: 'bg-rose-500',
  SICK_LEAVE_UNPAID: 'bg-rose-700',
  VACATION: 'bg-emerald-500',
  HOLIDAY: 'bg-violet-500',
}

const STATUS_BADGE: Record<WorkDayStatus, string> = {
  WEEKEND_PAID: 'bg-amber-400/10 text-amber-600 dark:text-amber-400',
  WEEKEND_UNPAID: 'bg-amber-600/10 text-amber-700 dark:text-amber-500',
  SICK_LEAVE_PAID: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  SICK_LEAVE_UNPAID: 'bg-rose-700/10 text-rose-700 dark:text-rose-500',
  VACATION: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  HOLIDAY: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
}

/** Neutral treatment for a day with no exception record. */
const NEUTRAL_DOT = 'bg-muted-foreground/20'

// ── Day lookup ────────────────────────────────────────────────────────────────

interface DayMaps {
  workDayMap: Map<string, WorkDay>
}

/** Merge any number of range payloads into a day-keyed lookup. */
function buildDayMaps(datasets: (MonthData | undefined)[]): DayMaps {
  const workDayMap = new Map<string, WorkDay>()
  for (const data of datasets) {
    for (const wd of data?.workDays ?? []) workDayMap.set(toKey(wd.date), wd)
  }
  return { workDayMap }
}

/** Resolve a day's exception status, if any. Days with no record are regular working days. */
function resolveDay(date: Date, maps: DayMaps) {
  const key = toKey(date.toISOString())
  const workDay = maps.workDayMap.get(key)
  return { key, workDay, status: workDay?.status, confirmed: Boolean(workDay) }
}

// ── DayModal ──────────────────────────────────────────────────────────────────
//
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

function DayModal({ open, onClose, date, workDay }: DayModalProps) {
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

// ── Zoom model ────────────────────────────────────────────────────────────────
//
// One continuous value drives all three views:
//
//   0 ── year ──── 1 ── month ──── 2 ── week
//
// Fractional values are mid-gesture. Each level sits at scale 1 / opacity 1 when
// `zoom` lands on it and fades as `zoom` moves away. Neighbouring levels meet at
// the same scale halfway between them, so the crossfade reads as one surface
// being magnified rather than two views swapping.
//
// The zoom value deliberately lives OUTSIDE React state. Re-rendering three
// calendar grids (the year view alone is 365 nodes) on every animation frame
// drops frames; instead each frame writes transform/opacity straight to the
// layer elements, and snapping hands off to a CSS transition that the compositor
// runs on its own. React state only tracks the settled level, which changes at
// most once per gesture.

const YEAR = 0
const MONTH = 1
const WEEK = 2
const LEVELS = [YEAR, MONTH, WEEK] as const

type Level = typeof LEVELS[number]

/** Subtle — the fade should carry the transition, not the scaling. */
const SCALE_SPREAD = 0.16
/** Resistance past the first/last level, so the ends feel elastic. */
const RUBBER = 0.25
/** Trackpad pinch travel → zoom levels. */
const WHEEL_SENSITIVITY = 0.012
/** Settle delay after the last wheel event (wheel pinch has no "end" event). */
const WHEEL_SETTLE_MS = 120
/** Long, soft ease-out — the shape iOS uses for view transitions. */
const SNAP_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'
const SNAP_MS = 460
const LAYER_TRANSITION =
  `opacity ${SNAP_MS}ms ${SNAP_EASE}, transform ${SNAP_MS}ms ${SNAP_EASE}`

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
/** s(x) + s(1-x) === 1, so the two active layers always sum to full opacity. */
const smoothstep = (p: number) => p * p * (3 - 2 * p)

function useZoomLayers(initial: Level) {
  const zoomRef = useRef<number>(initial)
  const layerRefs = useRef<Array<HTMLDivElement | null>>([])
  const [level, setLevel] = useState<Level>(initial)

  /** Write the zoom straight to the DOM — no React render involved. */
  const paint = useCallback((z: number, animate: boolean) => {
    zoomRef.current = z

    for (const lvl of LEVELS) {
      const el = layerRefs.current[lvl]
      if (!el) continue

      const d = z - lvl
      const dist = Math.abs(d)
      const visible = dist < 1

      el.style.transition = animate ? LAYER_TRANSITION : 'none'
      el.style.transform = `scale(${(1 + d * SCALE_SPREAD).toFixed(4)})`
      el.style.opacity = visible ? smoothstep(1 - dist).toFixed(4) : '0'
      // visibility (not display) keeps the layer out of the tab order and off
      // the paint list without forcing a re-layout when it comes back.
      el.style.visibility = visible ? 'visible' : 'hidden'
      // Only the front-most layer is interactive, so a half-faded view can
      // never swallow a click.
      el.style.pointerEvents = dist < 0.5 ? 'auto' : 'none'
    }
  }, [])

  /** Ease to the nearest level and let CSS run the animation. */
  const snap = useCallback((from?: number) => {
    const target = clamp(Math.round(from ?? zoomRef.current), YEAR, WEEK) as Level
    paint(target, true)
    setLevel(target)
  }, [paint])

  // Position the layers before first paint, so nothing flashes stacked.
  useLayoutEffect(() => { paint(zoomRef.current, false) }, [paint])

  return { zoomRef, layerRefs, level, paint, snap }
}

/**
 * Pinch-to-zoom over `ref`, covering all three ways a browser reports it:
 *  - Safari fires the non-standard gesture* events
 *  - Chrome/Edge/Firefox report a trackpad pinch as wheel + ctrlKey
 *  - touch screens give us two touch points to measure directly
 */
function usePinchZoom(
  ref: React.RefObject<HTMLElement | null>,
  ctl: ReturnType<typeof useZoomLayers>,
) {
  const { zoomRef, paint, snap } = ctl

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let settleTimer: ReturnType<typeof setTimeout> | null = null
    let gestureStartZoom = 0
    let pinchStartDist = 0

    // Elastic past the ends instead of a hard stop.
    const withRubber = (z: number) => {
      if (z < YEAR) return YEAR + (z - YEAR) * RUBBER
      if (z > WEEK) return WEEK + (z - WEEK) * RUBBER
      return z
    }

    const settleSoon = () => {
      if (settleTimer) clearTimeout(settleTimer)
      settleTimer = setTimeout(() => snap(), WHEEL_SETTLE_MS)
    }

    // ── trackpad pinch (Chrome/Edge/Firefox) ────────────────────────────────
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return          // plain scroll — leave it alone
      e.preventDefault()
      paint(withRubber(zoomRef.current - e.deltaY * WHEEL_SENSITIVITY), false)
      settleSoon()
    }

    // ── trackpad pinch (Safari) ─────────────────────────────────────────────
    const onGestureStart = (e: Event) => {
      e.preventDefault()
      gestureStartZoom = zoomRef.current
    }
    const onGestureChange = (e: Event) => {
      e.preventDefault()
      const scale = (e as Event & { scale: number }).scale
      if (!scale) return
      paint(withRubber(gestureStartZoom + Math.log2(scale)), false)
    }
    const onGestureEnd = (e: Event) => { e.preventDefault(); snap() }

    // ── touch pinch ─────────────────────────────────────────────────────────
    const distance = (touches: TouchList) =>
      Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY,
      )

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      pinchStartDist = distance(e.touches)
      gestureStartZoom = zoomRef.current
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pinchStartDist) return
      e.preventDefault()
      // Doubling the finger spread advances exactly one level.
      paint(withRubber(gestureStartZoom + Math.log2(distance(e.touches) / pinchStartDist)), false)
    }
    const onTouchEnd = () => {
      if (!pinchStartDist) return
      pinchStartDist = 0
      snap()
    }

    // passive:false — these need preventDefault to stop the browser zooming the
    // page instead of our calendar.
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('gesturestart', onGestureStart as EventListener)
    el.addEventListener('gesturechange', onGestureChange as EventListener)
    el.addEventListener('gestureend', onGestureEnd as EventListener)
    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)

    return () => {
      if (settleTimer) clearTimeout(settleTimer)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('gesturestart', onGestureStart as EventListener)
      el.removeEventListener('gesturechange', onGestureChange as EventListener)
      el.removeEventListener('gestureend', onGestureEnd as EventListener)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [ref, zoomRef, paint, snap])
}

// ── Shared view props ─────────────────────────────────────────────────────────

interface ViewProps {
  maps: DayMaps
  todayKey: string
  locale: string
  onSelectDay: (d: Date) => void
}

// ── Year view ─────────────────────────────────────────────────────────────────

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

function YearView({
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

// ── Month view ────────────────────────────────────────────────────────────────

function MonthView({
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

// ── Week view ─────────────────────────────────────────────────────────────────
//
// A simple day-by-day agenda list. This used to be an hour-by-hour time grid
// built around WorkDay.startTime/endTime, but the backend dropped those
// fields in the work-day status rework — there's no per-day time range to
// plot anymore, only an exception status. Rebuild as a time grid once
// WorkTimeEntry (server/prisma/schema.prisma) has a real endpoint behind it.

function WeekView({
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

// ── Zoomable calendar ─────────────────────────────────────────────────────────

function ZoomCalendar({
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

// ── Stats card ────────────────────────────────────────────────────────────────

function StatsCard({ daysOff }: { daysOff?: number }) {
  const { t } = useTranslation()

  return (
    <Card className="shrink-0">
      <CardContent className="pb-4 pt-4">
        <p className="text-xs text-muted-foreground">{t('me.daysOffThisMonth')}</p>
        <p className="mt-1 text-2xl font-semibold">{daysOff ?? '—'}</p>
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function SchedulePage() {
  // Anchor lives here so the stats card tracks the month being viewed.
  const [anchor, setAnchor] = useState(todayUTC)
  const { data: monthData } = useMonthData(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1)

  return (
    <main className="flex h-[calc(100vh-56px)] flex-col gap-4 p-6">
      <StatsCard daysOff={monthData?.stats.daysOff} />
      <ZoomCalendar anchor={anchor} setAnchor={setAnchor} />
    </main>
  )
}
