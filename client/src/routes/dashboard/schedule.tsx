import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

function getDowLabel(idx: number, locale: string, style: 'short' | 'long' = 'short') {
  // April 13, 2026 is a Monday — use it as reference
  return new Date(Date.UTC(2026, 3, 13 + idx)).toLocaleDateString(locale, { weekday: style })
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

/** "5 – 11 August 2026", collapsing the month when the week doesn't straddle one. */
function formatWeekRange(start: Date, locale: string) {
  const end = addDays(start, 6)
  const sameMonth = start.getUTCMonth() === end.getUTCMonth()
  const startLabel = start.toLocaleDateString(
    locale,
    sameMonth ? { day: 'numeric', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' },
  )
  const endLabel = end.toLocaleDateString(locale, {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
  return `${startLabel} – ${endLabel}`
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

// Year view — solid dots, one per day
const STATUS_DOT: Record<WorkDayStatus, string> = {
  WORKING:    'bg-blue-500',
  WEEKEND:    'bg-amber-400',
  SICK_LEAVE: 'bg-rose-500',
  VACATION:   'bg-emerald-500',
}

const STATUS_DOT_DIM: Record<WorkDayStatus, string> = {
  WORKING:    'bg-blue-500/25',
  WEEKEND:    'bg-amber-400/30',
  SICK_LEAVE: 'bg-rose-500/25',
  VACATION:   'bg-emerald-500/25',
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

/** Merge any number of month/year payloads into day-keyed lookups. */
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
// Fractional values are mid-gesture. Each level renders at scale 1 / opacity 1
// when `zoom` sits exactly on it, and grows + fades as `zoom` moves past it.
// Because neighbouring levels meet at the same scale halfway between them, the
// crossfade reads as a single surface being magnified rather than two views
// swapping — the trick iOS uses in Photos and Calendar.

const YEAR = 0
const MONTH = 1
const WEEK = 2
const LEVELS = [YEAR, MONTH, WEEK] as const

type Level = typeof LEVELS[number]

/** How much a layer grows per level of zoom past it. */
const SCALE_SPREAD = 0.45
/** Resistance applied past the first/last level, so the ends feel elastic. */
const RUBBER = 0.25
/** Trackpad pinch travel → zoom levels. */
const WHEEL_SENSITIVITY = 0.012
/** Settle delay after the last wheel event (wheel pinch has no "end" event). */
const WHEEL_SETTLE_MS = 130
const SNAP_MS = 340

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3)
/** Ease the crossfade so both layers stay legible through the midpoint. */
const smoothstep = (p: number) => p * p * (3 - 2 * p)

function useZoom(initial: number) {
  const [zoom, setZoomState] = useState(initial)
  const zoomRef = useRef(initial)
  const rafRef = useRef<number | null>(null)

  const set = useCallback((z: number) => {
    zoomRef.current = z
    setZoomState(z)
  }, [])

  const stop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }, [])

  const animateTo = useCallback((target: number, duration = SNAP_MS) => {
    stop()
    const from = zoomRef.current
    const delta = target - from
    if (Math.abs(delta) < 0.0005) { set(target); return }

    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      set(from + delta * easeOutCubic(p))
      rafRef.current = p < 1 ? requestAnimationFrame(tick) : null
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [set, stop])

  useEffect(() => stop, [stop])

  return { zoom, zoomRef, set, stop, animateTo }
}

/**
 * Pinch-to-zoom over `ref`, covering all three ways a browser reports it:
 *  - Safari fires the non-standard gesture* events
 *  - Chrome/Edge/Firefox report a trackpad pinch as wheel + ctrlKey
 *  - touch screens give us two touch points to measure directly
 */
function usePinchZoom(
  ref: React.RefObject<HTMLElement | null>,
  zoom: ReturnType<typeof useZoom>,
) {
  const { zoomRef, set, stop, animateTo } = zoom

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

    const snap = () => animateTo(clamp(Math.round(zoomRef.current), YEAR, WEEK))

    const settleSoon = () => {
      if (settleTimer) clearTimeout(settleTimer)
      settleTimer = setTimeout(snap, WHEEL_SETTLE_MS)
    }

    // ── trackpad pinch (Chrome/Edge/Firefox) ────────────────────────────────
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return          // plain scroll — leave it alone
      e.preventDefault()
      stop()
      set(withRubber(zoomRef.current - e.deltaY * WHEEL_SENSITIVITY))
      settleSoon()
    }

    // ── trackpad pinch (Safari) ─────────────────────────────────────────────
    const onGestureStart = (e: Event) => {
      e.preventDefault()
      stop()
      gestureStartZoom = zoomRef.current
    }
    const onGestureChange = (e: Event) => {
      e.preventDefault()
      const scale = (e as Event & { scale: number }).scale
      if (!scale) return
      set(withRubber(gestureStartZoom + Math.log2(scale)))
    }
    const onGestureEnd = (e: Event) => { e.preventDefault(); snap() }

    // ── touch pinch ─────────────────────────────────────────────────────────
    const distance = (touches: TouchList) => {
      const [a, b] = [touches[0], touches[1]]
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      stop()
      pinchStartDist = distance(e.touches)
      gestureStartZoom = zoomRef.current
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pinchStartDist) return
      e.preventDefault()
      // Doubling the finger spread advances exactly one level.
      set(withRubber(gestureStartZoom + Math.log2(distance(e.touches) / pinchStartDist)))
    }
    const onTouchEnd = () => {
      if (!pinchStartDist) return
      pinchStartDist = 0
      snap()
    }

    // passive:false — all of these need preventDefault to stop the browser
    // zooming the page instead of our calendar.
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
  }, [ref, zoomRef, set, stop, animateTo])
}

// ── Year view ─────────────────────────────────────────────────────────────────

interface ViewProps {
  maps: DayMaps
  defaults: Record<number, WorkDayStatus>
  todayKey: string
  locale: string
  onSelectDay: (d: Date) => void
}

function YearView({
  year, maps, defaults, todayKey, locale, onPickMonth,
}: Omit<ViewProps, 'onSelectDay'> & { year: number; onPickMonth: (month: number) => void }) {
  return (
    <div className="grid h-full grid-cols-2 gap-x-4 gap-y-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
        const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
        const startDow = dowIndex(utcDay(year, month, 1))

        return (
          <button
            key={month}
            onClick={() => onPickMonth(month)}
            className="flex flex-col rounded-lg p-2 text-left transition-colors hover:bg-muted/60"
          >
            <span className="mb-1.5 text-[11px] font-semibold capitalize text-primary">
              {formatMonthShort(year, month, locale)}
            </span>
            <div className="grid grid-cols-7 gap-0.75">
              {Array.from({ length: startDow }).map((_, i) => (
                <span key={`pad-${i}`} className="size-1.5" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const date = utcDay(year, month, day)
                const key = toKey(date.toISOString())
                const wd = maps.workDayMap.get(key)
                const status = wd?.status ?? defaults[dowIndex(date)]
                const dot = wd ? STATUS_DOT[status] : STATUS_DOT_DIM[status]

                return (
                  <span
                    key={key}
                    className={[
                      'size-1.5 rounded-full',
                      dot,
                      key === todayKey ? 'ring-2 ring-primary ring-offset-1' : '',
                    ].filter(Boolean).join(' ')}
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
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const startDow = dowIndex(utcDay(year, month, 1))
  const numRows = Math.ceil((startDow + daysInMonth) / 7)

  const DOW_LABELS = Array.from({ length: 7 }, (_, i) => getDowLabel(i, locale, 'short'))

  return (
    <div className="flex h-full flex-col">
      <div className="grid shrink-0 grid-cols-7">
        {DOW_LABELS.map((d) => (
          <div key={d} className="py-1 text-center text-[11px] font-medium capitalize text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      <div
        className="grid min-h-0 flex-1 grid-cols-7 gap-0.5"
        style={{ gridTemplateRows: `repeat(${numRows}, 1fr)` }}
      >
        {Array.from({ length: startDow }).map((_, i) => (
          <div key={`pad-${i}`} className="rounded-md" />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const date = utcDay(year, month, day)
          const key = toKey(date.toISOString())
          const wd = maps.workDayMap.get(key)
          const tasks = maps.tasksByDay.get(key) ?? []
          const isToday = key === todayKey
          const status = wd?.status ?? defaults[dowIndex(date)]
          const bgClass = wd ? STATUS_BG[status] : STATUS_BG_DIM[status]

          return (
            <button
              key={key}
              onClick={() => onSelectDay(date)}
              className={[
                'flex flex-col items-center justify-center gap-1.5 rounded-md text-xs transition-colors hover:brightness-95',
                bgClass,
                isToday ? 'ring-2 ring-primary ring-offset-1' : '',
              ].filter(Boolean).join(' ')}
            >
              <span className={`text-base font-semibold leading-none ${isToday ? 'text-primary' : ''}`}>
                {day}
              </span>
              {wd?.startTime && wd?.endTime && (
                <span className="text-[10px] leading-none opacity-60">
                  {wd.startTime.slice(0, 5)}–{wd.endTime.slice(0, 5)}
                </span>
              )}
              {tasks.length > 0 && (
                <div className="flex gap-0.5">
                  {tasks.slice(0, 3).map((_, ti) => (
                    <div key={ti} className="size-1.5 rounded-full bg-emerald-500" />
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

function WeekView({
  weekStart, maps, defaults, todayKey, locale, onSelectDay,
}: ViewProps & { weekStart: Date }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="grid h-full grid-cols-7 gap-1.5">
      {days.map((date) => {
        const key = toKey(date.toISOString())
        const wd = maps.workDayMap.get(key)
        const tasks = maps.tasksByDay.get(key) ?? []
        const isToday = key === todayKey
        const status = wd?.status ?? defaults[dowIndex(date)]
        const bgClass = wd ? STATUS_BG[status] : STATUS_BG_DIM[status]

        return (
          <button
            key={key}
            onClick={() => onSelectDay(date)}
            className={[
              'flex min-h-0 flex-col items-stretch gap-2 rounded-xl p-2 text-left transition-colors hover:brightness-95',
              bgClass,
              isToday ? 'ring-2 ring-primary ring-offset-1' : '',
            ].filter(Boolean).join(' ')}
          >
            <div className="shrink-0 text-center">
              <div className="text-[11px] font-medium capitalize text-muted-foreground">
                {getDowLabel(dowIndex(date), locale, 'short')}
              </div>
              <div className={`text-2xl font-semibold leading-tight ${isToday ? 'text-primary' : ''}`}>
                {date.getUTCDate()}
              </div>
              {wd?.startTime && wd?.endTime && (
                <div className="text-[11px] leading-none opacity-70">
                  {wd.startTime.slice(0, 5)}–{wd.endTime.slice(0, 5)}
                </div>
              )}
            </div>

            {/* Zoomed in this far there is room for the actual task titles. */}
            {tasks.length > 0 && (
              <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-md bg-background/70 px-1.5 py-1 text-[11px] leading-tight"
                  >
                    <span className="line-clamp-2">{task.title}</span>
                  </div>
                ))}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Zoomable calendar ─────────────────────────────────────────────────────────

function ZoomCalendar({ userId }: { userId: number }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'uk' ? 'uk-UA' : 'en-US'

  const containerRef = useRef<HTMLDivElement | null>(null)
  const zoomCtl = useZoom(MONTH)
  const { zoom, animateTo } = zoomCtl
  usePinchZoom(containerRef, zoomCtl)

  // The day the calendar is centred on; every view derives its range from it.
  const [anchor, setAnchor] = useState(() => {
    const now = new Date()
    return utcDay(now.getFullYear(), now.getMonth() + 1, now.getDate())
  })
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const level = clamp(Math.round(zoom), YEAR, WEEK) as Level
  const year = anchor.getUTCFullYear()
  const month = anchor.getUTCMonth() + 1
  const weekStart = startOfWeek(anchor)
  const weekEnd = addDays(weekStart, 6)

  // Only fetch what is on screen (or being zoomed toward).
  const monthQ = useMonthData(year, month)
  const yearQ  = useYearData(year, zoom < MONTH)
  // A week can straddle two months; when it doesn't, both keys collapse to one
  // query and React Query dedupes them.
  const weekAQ = useMonthData(weekStart.getUTCFullYear(), weekStart.getUTCMonth() + 1, zoom > MONTH)
  const weekBQ = useMonthData(weekEnd.getUTCFullYear(), weekEnd.getUTCMonth() + 1, zoom > MONTH)

  // localStorage + JSON.parse per day would be ~365 reads in the year view.
  const defaults = useMemo(() => getWeeklyDefaults(userId), [userId])

  const monthMaps = useMemo(() => buildDayMaps([monthQ.data]), [monthQ.data])
  const yearMaps  = useMemo(() => buildDayMaps([yearQ.data]), [yearQ.data])
  const weekMaps  = useMemo(
    () => buildDayMaps([weekAQ.data, weekBQ.data]),
    [weekAQ.data, weekBQ.data],
  )

  const todayKey = toKey(new Date().toISOString())

  // Prev/next step by whatever unit is currently in focus.
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
    animateTo(MONTH)
  }

  const selKey     = selectedDate ? toKey(selectedDate.toISOString()) : null
  const activeMaps = level === YEAR ? yearMaps : level === WEEK ? weekMaps : monthMaps
  const selWorkDay = selKey ? activeMaps.workDayMap.get(selKey) : undefined
  const selTasks   = selKey ? (activeMaps.tasksByDay.get(selKey) ?? []) : []

  return (
    <>
      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="shrink-0 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium">{t('me.schedule')}</CardTitle>

            <div className="flex items-center gap-2">
              {/* Explicit control — pinch is invisible, and this is keyboard-reachable */}
              <div className="flex rounded-lg bg-muted p-0.5">
                {zoomLabels.map((z) => (
                  <button
                    key={z.level}
                    onClick={() => animateTo(z.level)}
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
            under us; the layers below are stacked and cross-faded by `zoom`.
          */}
          <div ref={containerRef} className="relative min-h-0 flex-1 touch-none overflow-hidden">
            {LEVELS.map((lvl) => {
              const d = zoom - lvl
              if (Math.abs(d) >= 1) return null   // fully faded out — don't render

              const opacity = smoothstep(1 - Math.abs(d))
              const scale = 1 + d * SCALE_SPREAD
              const isFront = Math.abs(d) < 0.5

              return (
                <div
                  key={lvl}
                  aria-hidden={!isFront}
                  className="absolute inset-0"
                  style={{
                    opacity,
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center',
                    // Only the front-most layer is interactive, so a half-faded
                    // view can never swallow a click.
                    pointerEvents: isFront ? 'auto' : 'none',
                    willChange: 'transform, opacity',
                  }}
                >
                  {lvl === YEAR && (
                    <YearView
                      year={year} maps={yearMaps} defaults={defaults}
                      todayKey={todayKey} locale={locale} onPickMonth={pickMonth}
                    />
                  )}
                  {lvl === MONTH && (
                    <MonthView
                      year={year} month={month} maps={monthMaps} defaults={defaults}
                      todayKey={todayKey} locale={locale} onSelectDay={setSelectedDate}
                    />
                  )}
                  {lvl === WEEK && (
                    <WeekView
                      weekStart={weekStart} maps={weekMaps} defaults={defaults}
                      todayKey={todayKey} locale={locale} onSelectDay={setSelectedDate}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 flex shrink-0 flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3">
            {([
              ['bg-blue-500/20',    t('me.statusWorking')],
              ['bg-amber-400/25',   t('me.statusWeekend')],
              ['bg-rose-500/20',    t('me.statusSickLeave')],
              ['bg-emerald-500/20', t('me.statusVacation')],
            ] as [string, string][]).map(([cls, label]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className={`inline-block size-2.5 rounded-sm ${cls}`} />
                <span className="text-[11px] text-muted-foreground">{label}</span>
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-muted-foreground">{t('me.completed')}</span>
            </span>
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
    <div className="grid grid-cols-2 gap-3">
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
  const now = new Date()
  const { data: me, isLoading } = useMe()
  const { data: monthData } = useMonthData(now.getFullYear(), now.getMonth() + 1)

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
      <ZoomCalendar userId={me?.id ?? 0} />
    </main>
  )
}
