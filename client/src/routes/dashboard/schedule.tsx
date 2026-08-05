import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
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
import { useMonthData, useUpsertWorkDay } from '#/lib/workdays/mutations'
import type { CompletedTask, WorkDay, WorkDayStatus } from '#/lib/workdays/types'

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function toKey(iso: string) { return iso.slice(0, 10) }

/** Mon-based index: 0=Mon … 6=Sun */
function dowIndex(date: Date) {
  const d = date.getDay()
  return d === 0 ? 6 : d - 1
}

function getDowLabel(idx: number, locale: string, style: 'short' | 'long' = 'short') {
  // April 13, 2026 is a Monday — use it as reference
  return new Date(Date.UTC(2026, 3, 13 + idx)).toLocaleDateString(locale, { weekday: style })
}

function formatMonthYear(year: number, month: number, locale: string) {
  const name = new Date(Date.UTC(year, month - 1, 1))
    .toLocaleDateString(locale, { month: 'long' })
  return name.charAt(0).toUpperCase() + name.slice(1) + ' ' + year
}

function formatDayTitle(date: Date, locale: string) {
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
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

// ── DayModal ──────────────────────────────────────────────────────────────────

interface DayModalProps {
  open: boolean
  onClose: () => void
  date: Date
  workDay: WorkDay | undefined
  tasksOnDay: CompletedTask[]
  year: number
  month: number
  userId: number
}

function DayModal({ open, onClose, date, workDay, tasksOnDay, year, month, userId }: DayModalProps) {
  const { t, i18n } = useTranslation()
  const upsert = useUpsertWorkDay(year, month)
  const locale = i18n.language === 'uk' ? 'uk-UA' : 'en-US'

  const defaultStatus = getWeeklyDefaults(userId)[dowIndex(date)]
  const [editing, setEditing] = useState(!workDay)
  const [status, setStatus] = useState<WorkDayStatus>(workDay?.status ?? defaultStatus)
  const [startTime, setStartTime] = useState(workDay?.startTime ?? '')
  const [endTime, setEndTime] = useState(workDay?.endTime ?? '')

  // Sync when the selected day changes
  useEffect(() => {
    setEditing(!workDay)
    setStatus(workDay?.status ?? getWeeklyDefaults(userId)[dowIndex(date)])
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

// ── Calendar grid ─────────────────────────────────────────────────────────────

interface CalendarProps {
  year: number
  month: number
  onPrev: () => void
  onNext: () => void
  userId: number
}

function MonthCalendar({ year, month, onPrev, onNext, userId }: CalendarProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'uk' ? 'uk-UA' : 'en-US'
  const { data } = useMonthData(year, month)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const workDayMap = new Map<string, WorkDay>()
  for (const wd of data?.workDays ?? []) workDayMap.set(toKey(wd.date), wd)

  const tasksByDay = new Map<string, CompletedTask[]>()
  for (const task of data?.completedTasks ?? []) {
    const k = toKey(task.updatedAt)
    if (!tasksByDay.has(k)) tasksByDay.set(k, [])
    tasksByDay.get(k)!.push(task)
  }

  const firstDay  = new Date(Date.UTC(year, month - 1, 1))
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getDate()
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const todayKey = new Date().toISOString().slice(0, 10)

  const selKey      = selectedDate ? toKey(selectedDate.toISOString()) : null
  const selWorkDay  = selKey ? workDayMap.get(selKey) : undefined
  const selTasks    = selKey ? (tasksByDay.get(selKey) ?? []) : []

  const DOW_LABELS = Array.from({ length: 7 }, (_, i) => getDowLabel(i, locale, 'short'))
  const numRows = Math.ceil((startDow + daysInMonth) / 7)

  return (
    <>
      <Card className="flex flex-col flex-1 min-h-0">
        <CardHeader className="pb-2 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{t('me.schedule')}</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="size-7" onClick={onPrev}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-32.5 text-center text-sm font-medium">
                {formatMonthYear(year, month, locale)}
              </span>
              <Button variant="ghost" size="icon" className="size-7" onClick={onNext}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col flex-1 min-h-0 pb-4">
          {/* DOW header */}
          <div className="grid grid-cols-7 mb-1 shrink-0">
            {DOW_LABELS.map((d) => (
              <div key={d} className="py-1 text-center text-[11px] font-medium text-muted-foreground capitalize">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid — rows grow to fill available height */}
          <div
            className="grid grid-cols-7 gap-0.5 flex-1 min-h-0"
            style={{ gridTemplateRows: `repeat(${numRows}, 1fr)` }}
          >
            {Array.from({ length: startDow }).map((_, i) => (
              <div key={`pad-${i}`} className="rounded-md" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateObj = new Date(Date.UTC(year, month - 1, day))
              const key = toKey(dateObj.toISOString())
              const wd = workDayMap.get(key)
              const tasks = tasksByDay.get(key) ?? []
              const isToday = key === todayKey
              const effectiveStatus: WorkDayStatus =
                wd?.status ?? getWeeklyDefaults(userId)[dowIndex(dateObj)]
              const bgClass = wd ? STATUS_BG[effectiveStatus] : STATUS_BG_DIM[effectiveStatus]

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(dateObj)}
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

          {/* Legend */}
          <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-x-4 gap-y-1 shrink-0">
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
          year={year}
          month={month}
          userId={userId}
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
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data: me, isLoading } = useMe()
  const { data: monthData } = useMonthData(year, month)

  const handlePrev = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else setMonth((m) => m - 1)
  }

  const handleNext = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else setMonth((m) => m + 1)
  }

  if (isLoading) {
    return (
      <main className="flex items-center justify-center p-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-4 p-6 h-[calc(100vh-56px)]">
      <StatsCards stats={monthData?.stats} />
      <MonthCalendar
        year={year} month={month}
        onPrev={handlePrev} onNext={handleNext}
        userId={me?.id ?? 0}
      />
    </main>
  )
}
