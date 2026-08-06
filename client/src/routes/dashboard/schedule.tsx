import { createFileRoute } from '@tanstack/react-router'
import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Loader2, Pencil } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '#/components/ui/select'
import { useMe } from '#/lib/auth/mutations'
import { useMonthData, useUpsertWorkDay, useYearData } from '#/lib/workdays/mutations'
import type { CompletedTask, MonthData, WorkDay, WorkDayStatus } from '#/lib/workdays/types'

export const Route = createFileRoute('/dashboard/schedule')({ component: SchedulePage, ssr: false })

// ── Custom time picker ────────────────────────────────────────────────────────

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = ['00','05','10','15','20','25','30','35','40','45','50','55']

function TimePicker({
  value,
  onChange,
  minTime,
}: {
  value: string
  onChange: (v: string) => void
  minTime?: string  // "HH:MM" — all selectable times must be strictly after this
}) {
  const [h, m] = value ? value.split(':') : ['', '']
  const [minH, minM] = minTime ? minTime.split(':') : ['', '']

  const availableHours = minH
    ? HOURS.filter((hr) => Number(hr) >= Number(minH))
    : HOURS

  // Same hour as min → only allow minutes strictly greater than minM
  const availableMinutes = (minH && h === minH)
    ? MINUTES.filter((mn) => Number(mn) > Number(minM))
    : MINUTES

  const setH = (newH: string) => {
    if (newH === '_') { onChange(''); return }
    // If same hour as min, ensure minute is still valid
    let newM = m || '00'
    if (minH && newH === minH && Number(newM) <= Number(minM)) {
      newM = MINUTES.find((mn) => Number(mn) > Number(minM)) ?? ''
      if (!newM) { onChange(''); return }
    }
    onChange(`${newH}:${newM}`)
  }

  const setM = (newM: string) => {
    if (newM === '_') { onChange(''); return }
    onChange(`${h || '00'}:${newM}`)
  }

  return (
    <div className="flex items-center gap-1">
      <Select value={h || '_'} onValueChange={setH}>
        <SelectTrigger className="h-8 w-17 font-mono text-sm">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent className="max-h-52">
          <SelectItem value="_">—</SelectItem>
          {availableHours.map((hr) => <SelectItem key={hr} value={hr}>{hr}</SelectItem>)}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground font-semibold">:</span>
      <Select value={m || '_'} onValueChange={setM}>
        <SelectTrigger className="h-8 w-17 font-mono text-sm">
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent className="max-h-52">
          <SelectItem value="_">—</SelectItem>
          {availableMinutes.map((mn) => <SelectItem key={mn} value={mn}>{mn}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

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

/** "09:30" → 9.5 */
function timeToHours(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h + (m || 0) / 60
}

const DEFAULT_SCHEDULE: Record<number, WorkDayStatus> = {
  0: 'WORKING', 1: 'WORKING', 2: 'WORKING', 3: 'WORKING', 4: 'WORKING',
  5: 'WEEKEND', 6: 'WEEKEND',
}

function getWeeklyDefaults(userId: number): Record<number, WorkDayStatus> {
  try {
    return JSON.parse(localStorage.getItem(`weeklySchedule_${userId}`) ?? 'null') ?? DEFAULT_SCHEDULE
  } catch { return DEFAULT_SCHEDULE }
}

// ── Status styles ─────────────────────────────────────────────────────────────

// Confirmed (day has an actual WorkDay record)
const STATUS_BG: Record<WorkDayStatus, string> = {
  WORKING:    'bg-blue-500/20',
  WEEKEND:    'bg-amber-400/25',
  SICK_LEAVE: 'bg-rose-500/20',
  VACATION:   'bg-emerald-500/20',
}

// Inferred from weekly-schedule defaults (dimmer)
const STATUS_BG_DIM: Record<WorkDayStatus, string> = {
  WORKING:    'bg-blue-500/8',
  WEEKEND:    'bg-amber-400/10',
  SICK_LEAVE: 'bg-rose-500/8',
  VACATION:   'bg-emerald-500/8',
}

const STATUS_SOLID: Record<WorkDayStatus, string> = {
  WORKING:    'bg-blue-500',
  WEEKEND:    'bg-amber-400',
  SICK_LEAVE: 'bg-rose-500',
  VACATION:   'bg-emerald-500',
}

const STATUS_DOT_DIM: Record<WorkDayStatus, string> = {
  WORKING:    'bg-blue-500/30',
  WEEKEND:    'bg-amber-400/35',
  SICK_LEAVE: 'bg-rose-500/30',
  VACATION:   'bg-emerald-500/30',
}

const STATUS_BADGE: Record<WorkDayStatus, string> = {
  WORKING:    'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  WEEKEND:    'bg-amber-400/10 text-amber-600 dark:text-amber-400',
  SICK_LEAVE: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  VACATION:   'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW: 'text-muted-foreground', MEDIUM: 'text-blue-500',
  HIGH: 'text-amber-500',       URGENT: 'text-destructive',
}

// ── Day lookup ────────────────────────────────────────────────────────────────

interface DayMaps {
  workDayMap: Map<string, WorkDay>
  tasksByDay: Map<string, CompletedTask[]>
}

/** Merge any number of range payloads into day-keyed lookups. */
function buildDayMaps(datasets: (MonthData | undefined)[]): DayMaps {
  const workDayMap = new Map<string, WorkDay>()
  const tasksByDay = new Map<string, CompletedTask[]>()

  for (const data of datasets) {
    for (const wd of data?.workDays ?? []) workDayMap.set(toKey(wd.date), wd)
    for (const task of data?.completedTasks ?? []) {
      const k = toKey(task.updatedAt)
      if (!tasksByDay.has(k)) tasksByDay.set(k, [])
      tasksByDay.get(k)!.push(task)
    }
  }

  return { workDayMap, tasksByDay }
}

// ── DayModal ──────────────────────────────────────────────────────────────────

interface DayModalProps {
  open: boolean
  onClose: () => void
  date: Date
  workDay: WorkDay | undefined
  tasksOnDay: CompletedTask[]
  defaults: Record<number, WorkDayStatus>
}

function DayModal({ open, onClose, date, workDay, tasksOnDay, defaults }: DayModalProps) {
  const { t, i18n } = useTranslation()
  const upsert = useUpsertWorkDay()
  const locale = i18n.language === 'uk' ? 'uk-UA' : 'en-US'

  const defaultStatus = defaults[dowIndex(date)]
  const [editing, setEditing] = useState(!workDay)
  const [status, setStatus] = useState<WorkDayStatus>(workDay?.status ?? defaultStatus)
  const [startTime, setStartTime] = useState(workDay?.startTime ?? '')
  const [endTime, setEndTime] = useState(workDay?.endTime ?? '')

  // Sync when the selected day changes
  useEffect(() => {
    setEditing(!workDay)
    setStatus(workDay?.status ?? defaults[dowIndex(date)])
    setStartTime(workDay?.startTime ?? '')
    setEndTime(workDay?.endTime ?? '')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date.toISOString()])

  const statusOptions: { value: WorkDayStatus; label: string }[] = [
    { value: 'WORKING',    label: t('me.statusWorking') },
    { value: 'WEEKEND',    label: t('me.statusWeekend') },
    { value: 'SICK_LEAVE', label: t('me.statusSickLeave') },
    { value: 'VACATION',   label: t('me.statusVacation') },
  ]

  const handleSave = async () => {
    await upsert.mutateAsync({
      date: toKey(date.toISOString()),
      status,
      startTime: status === 'WORKING' && startTime ? startTime : undefined,
      endTime:   status === 'WORKING' && endTime   ? endTime   : undefined,
    })
    setEditing(false)
    if (!workDay) onClose()
  }

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
            {/* Status select */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{t('me.dayStatus')}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as WorkDayStatus)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time inputs — only WORKING */}
            {status === 'WORKING' && (
              <div className="flex gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">{t('me.workStart')}</Label>
                  <TimePicker
                    value={startTime}
                    onChange={(v) => {
                      setStartTime(v)
                      // Clear end time if it's no longer after start
                      if (endTime && v && endTime <= v) setEndTime('')
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">{t('me.workEnd')}</Label>
                  <TimePicker
                    value={endTime}
                    onChange={setEndTime}
                    minTime={startTime || undefined}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              {workDay && (
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                  {t('dashboard.team.cancel')}
                </Button>
              )}
              <Button size="sm" onClick={handleSave} disabled={upsert.isPending}>
                {upsert.isPending
                  ? <Loader2 className="size-3.5 animate-spin" />
                  : t('me.save')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Status + time */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[workDay!.status]}`}>
                {statusOptions.find((o) => o.value === workDay!.status)?.label}
              </span>
              {workDay!.startTime && workDay!.endTime && (
                <span className="text-sm text-muted-foreground">
                  {workDay!.startTime.slice(0, 5)} – {workDay!.endTime.slice(0, 5)}
                </span>
              )}
            </div>

            {/* Completed tasks */}
            {tasksOnDay.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">{t('me.completedOnDay')}</p>
                <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
                  {tasksOnDay.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{task.board.title}</p>
                      </div>
                      <span className={`shrink-0 text-xs font-medium ${PRIORITY_COLOR[task.priority]}`}>
                        {task.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : workDay!.status === 'WORKING' ? (
              <p className="text-sm text-muted-foreground">{t('schedule.noTasksOnDay')}</p>
            ) : null}
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
  defaults: Record<number, WorkDayStatus>
  todayKey: string
  locale: string
  onSelectDay: (d: Date) => void
}

/** Resolve a day's status and whether it is confirmed or merely inferred. */
function resolveDay(date: Date, maps: DayMaps, defaults: Record<number, WorkDayStatus>) {
  const key = toKey(date.toISOString())
  const workDay = maps.workDayMap.get(key)
  return {
    key,
    workDay,
    tasks: maps.tasksByDay.get(key) ?? [],
    status: workDay?.status ?? defaults[dowIndex(date)],
    confirmed: Boolean(workDay),
  }
}

// ── Year view ─────────────────────────────────────────────────────────────────

// Fixed track width: `grid-cols-7` would stretch each dot column to 1fr, and in
// a wide month cell that scatters the dots into sparse vertical stripes.
const DOT = 6      // px
const DOT_GAP = 4  // px
const DOT_GRID_W = DOT * 7 + DOT_GAP * 6

function YearView({
  year, maps, defaults, todayKey, locale, onPickMonth,
}: Omit<ViewProps, 'onSelectDay'> & { year: number; onPickMonth: (month: number) => void }) {
  return (
    // A fixed 3/4/6-column grid rather than flex-wrap: wrapping leaves an
    // orphan month on the last row and pins everything to the top.
    <div className="grid h-full grid-cols-3 place-content-center justify-items-center gap-x-4 gap-y-5 overflow-y-auto py-2 sm:grid-cols-4 xl:grid-cols-6">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
        const total = daysInMonthOf(year, month)
        const startDow = dowIndex(utcDay(year, month, 1))

        return (
          <button
            key={month}
            onClick={() => onPickMonth(month)}
            className="group flex shrink-0 flex-col items-start rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/50"
          >
            <span className="mb-1.5 text-[11px] font-semibold capitalize text-primary">
              {formatMonthShort(year, month, locale)}
            </span>
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(7, ${DOT}px)`,
                gap: `${DOT_GAP}px`,
                width: DOT_GRID_W,
              }}
            >
              {Array.from({ length: startDow }).map((_, i) => (
                <span key={`pad-${i}`} style={{ width: DOT, height: DOT }} />
              ))}
              {Array.from({ length: total }, (_, i) => i + 1).map((day) => {
                const date = utcDay(year, month, day)
                const { key, status, confirmed } = resolveDay(date, maps, defaults)
                const isToday = key === todayKey

                return (
                  <span
                    key={key}
                    style={{ width: DOT, height: DOT }}
                    className={[
                      'rounded-full',
                      isToday
                        ? 'bg-primary outline-2 outline-offset-1 outline-primary/40'
                        : confirmed ? STATUS_SOLID[status] : STATUS_DOT_DIM[status],
                    ].join(' ')}
                  />
                )
              })}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Month view ────────────────────────────────────────────────────────────────

function MonthView({
  year, month, maps, defaults, todayKey, locale, onSelectDay,
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
          const { key, workDay, tasks, status, confirmed } = resolveDay(date, maps, defaults)
          const isToday = key === todayKey

          return (
            <button
              key={key}
              onClick={() => onSelectDay(date)}
              className={[
                'flex flex-col items-center justify-center gap-1 rounded-lg text-xs transition-colors',
                confirmed ? STATUS_BG[status] : STATUS_BG_DIM[status],
                isToday ? 'ring-1 ring-primary' : 'hover:ring-1 hover:ring-border',
              ].join(' ')}
            >
              <span className={`text-base font-semibold leading-none ${isToday ? 'text-primary' : ''}`}>
                {day}
              </span>
              {workDay?.startTime && workDay?.endTime && (
                <span className="text-[10px] leading-none opacity-60">
                  {workDay.startTime.slice(0, 5)}–{workDay.endTime.slice(0, 5)}
                </span>
              )}
              {tasks.length > 0 && (
                <div className="flex gap-0.5">
                  {tasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="size-1.5 rounded-full bg-emerald-500" />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Week view ─────────────────────────────────────────────────────────────────
//
// A time grid, not seven tall empty cards: hour rows down the left, the working
// window drawn as a block in each day column. This is what gives the zoomed-in
// level something to actually show.

const HOUR_ROW_H = 46          // px per hour
const GUTTER = '3.25rem'
const DAY_START_FALLBACK = 8
const DAY_END_FALLBACK = 19

function WeekView({
  weekStart, maps, defaults, todayKey, locale, onSelectDay,
}: ViewProps & { weekStart: Date }) {
  const { t } = useTranslation()
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const resolved = days.map((d) => ({ date: d, ...resolveDay(d, maps, defaults) }))

  // Widen the visible hour range to cover whatever the week actually contains.
  let from = DAY_START_FALLBACK
  let to = DAY_END_FALLBACK
  for (const r of resolved) {
    if (r.workDay?.startTime) from = Math.min(from, Math.floor(timeToHours(r.workDay.startTime)))
    if (r.workDay?.endTime)   to   = Math.max(to,   Math.ceil(timeToHours(r.workDay.endTime)))
  }
  from = clamp(from, 0, 23)
  to = clamp(Math.max(to, from + 1), 1, 24)

  const hours = Array.from({ length: to - from }, (_, i) => from + i)
  const gridTemplateColumns = `${GUTTER} repeat(7, minmax(0, 1fr))`

  return (
    <div className="flex h-full flex-col">
      {/* Day headers — pinned above the scrolling time grid */}
      <div className="grid shrink-0 pb-1.5" style={{ gridTemplateColumns }}>
        <div />
        {resolved.map(({ date, key, status, confirmed }) => {
          const isToday = key === todayKey
          return (
            <button
              key={key}
              onClick={() => onSelectDay(date)}
              className="mx-0.5 flex flex-col items-center rounded-lg py-1 transition-colors hover:bg-muted/50"
            >
              <span className="text-[11px] font-medium capitalize text-muted-foreground">
                {getDowLabel(dowIndex(date), locale, 'short')}
              </span>
              <span
                className={[
                  'mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-semibold',
                  isToday ? 'bg-primary text-primary-foreground' : '',
                ].join(' ')}
              >
                {date.getUTCDate()}
              </span>
              {/* status pip, so non-working days still read at a glance */}
              <span
                className={[
                  'mt-1 h-1 w-4 rounded-full',
                  confirmed ? STATUS_SOLID[status] : STATUS_DOT_DIM[status],
                ].join(' ')}
              />
            </button>
          )
        })}
      </div>

      {/* pt-2 keeps the first hour label from clipping — it sits on the rule,
          vertically centred, so half of it hangs above the grid. */}
      <div className="min-h-0 flex-1 overflow-y-auto pt-2">
        <div
          className="relative grid"
          style={{ gridTemplateColumns, height: hours.length * HOUR_ROW_H }}
        >
          {/* Hour labels */}
          <div className="relative">
            {hours.map((h, i) => (
              <span
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
                style={{ top: i * HOUR_ROW_H }}
              >
                {String(h).padStart(2, '0')}:00
              </span>
            ))}
          </div>

          {/* Day columns */}
          {resolved.map(({ date, key, workDay, tasks, status, confirmed }) => {
            const isToday = key === todayKey
            const start = workDay?.startTime ? timeToHours(workDay.startTime) : null
            const end = workDay?.endTime ? timeToHours(workDay.endTime) : null
            const hasBlock = start != null && end != null && end > start

            return (
              <button
                key={key}
                onClick={() => onSelectDay(date)}
                className={[
                  'relative mx-0.5 rounded-lg border-l border-border/40 text-left transition-colors',
                  // Tint every column, confirmed or merely inferred, so a
                  // weekend still reads as a weekend in the time grid.
                  STATUS_BG_DIM[status],
                  isToday ? 'ring-1 ring-primary/30' : '',
                ].join(' ')}
              >
                {/* Hour rules */}
                {hours.map((h, i) => (
                  <span
                    key={h}
                    className="absolute inset-x-0 border-t border-border/25"
                    style={{ top: i * HOUR_ROW_H }}
                  />
                ))}

                {/* Working window */}
                {hasBlock && (
                  <div
                    className={[
                      'absolute inset-x-1 flex flex-col gap-1 overflow-hidden rounded-lg p-1.5',
                      STATUS_BG[status],
                    ].join(' ')}
                    style={{
                      top: (start! - from) * HOUR_ROW_H,
                      height: Math.max(22, (end! - start!) * HOUR_ROW_H),
                    }}
                  >
                    <span className="shrink-0 text-[10px] font-medium tabular-nums opacity-70">
                      {workDay!.startTime!.slice(0, 5)}–{workDay!.endTime!.slice(0, 5)}
                    </span>
                    {tasks.map((task) => (
                      <span
                        key={task.id}
                        className="line-clamp-2 shrink-0 rounded bg-background/60 px-1.5 py-0.5 text-[10px] leading-tight"
                      >
                        {task.title}
                      </span>
                    ))}
                  </div>
                )}

                {/* No working window — surface the status and any tasks instead */}
                {!hasBlock && (
                  <div className="absolute inset-x-1 top-1 flex flex-col gap-1">
                    {confirmed && (
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_BADGE[status]}`}>
                        {t(`me.status${status === 'SICK_LEAVE' ? 'SickLeave' : capitalize(status.toLowerCase())}`)}
                      </span>
                    )}
                    {tasks.map((task) => (
                      <span
                        key={task.id}
                        className="line-clamp-2 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] leading-tight"
                      >
                        {task.title}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Zoomable calendar ─────────────────────────────────────────────────────────

function ZoomCalendar({
  userId, anchor, setAnchor,
}: {
  userId: number
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

  // localStorage + JSON.parse per day would be ~365 reads in the year view.
  const defaults = useMemo(() => getWeeklyDefaults(userId), [userId])
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

  // Tapping a month in the year view zooms into it, iOS-style.
  const pickMonth = (m: number) => {
    setAnchor(utcDay(year, m, 1))
    snap(MONTH)
  }

  const selKey     = selectedDate ? toKey(selectedDate.toISOString()) : null
  const selWorkDay = selKey ? maps.workDayMap.get(selKey) : undefined
  const selTasks   = selKey ? (maps.tasksByDay.get(selKey) ?? []) : []

  const viewProps = { maps, defaults, todayKey, locale, onSelectDay: setSelectedDate }

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
                  <YearView
                    year={year} maps={maps} defaults={defaults}
                    todayKey={todayKey} locale={locale} onPickMonth={pickMonth}
                  />
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
            {([
              ['bg-blue-500',    t('me.statusWorking')],
              ['bg-amber-400',   t('me.statusWeekend')],
              ['bg-rose-500',    t('me.statusSickLeave')],
              ['bg-emerald-500', t('me.statusVacation')],
            ] as [string, string][]).map(([cls, label]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className={`inline-block size-2 rounded-full ${cls}`} />
                <span className="text-[11px] text-muted-foreground">{label}</span>
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
          tasksOnDay={selTasks}
          defaults={defaults}
        />
      )}
    </>
  )
}

// ── Stats cards ───────────────────────────────────────────────────────────────

function StatsCards({ stats }: {
  stats?: { workingDays: number; totalHours: number }
}) {
  const { t } = useTranslation()

  const cards = [
    { label: t('me.workingDays'),    value: stats?.workingDays ?? '—' },
    {
      label: t('me.hoursThisMonth'),
      value: stats?.totalHours != null ? `${stats.totalHours}${t('schedule.hoursUnit')}` : '—',
    },
  ]

  return (
    <div className="grid shrink-0 grid-cols-2 gap-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="pb-4 pt-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function SchedulePage() {
  // Anchor lives here so the stats cards track the month being viewed.
  const [anchor, setAnchor] = useState(todayUTC)

  const { data: me, isLoading } = useMe()
  const { data: monthData } = useMonthData(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1)

  if (isLoading) {
    return (
      <main className="flex items-center justify-center p-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    )
  }

  return (
    <main className="flex h-[calc(100vh-56px)] flex-col gap-4 p-6">
      <StatsCards stats={monthData?.stats} />
      <ZoomCalendar userId={me?.id ?? 0} anchor={anchor} setAnchor={setAnchor} />
    </main>
  )
}
