import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Flag, Loader2, Pencil } from 'lucide-react'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '#/components/ui/accordion'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Label } from '#/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '#/components/ui/select'
import { useMe } from '#/lib/auth/mutations'
import { useMyTasks, useUpdateMyStatus } from '#/lib/tasks/mutations'
import { useMonthData } from '#/lib/workdays/mutations'
import type { Task, TaskStatus } from '#/lib/tasks/types'

export const Route = createFileRoute('/dashboard/me')({ component: MePage, ssr: false })

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done',
}

const STATUS_COLOR: Record<TaskStatus, string> = {
  TODO:        'bg-muted text-muted-foreground',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-500',
  IN_REVIEW:   'bg-amber-500/10 text-amber-500',
  DONE:        'bg-emerald-500/10 text-emerald-500',
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW: 'text-muted-foreground', MEDIUM: 'text-blue-500',
  HIGH: 'text-amber-500',       URGENT: 'text-destructive',
}

function MePage() {
  const { t } = useTranslation()
  const { data: me, isLoading: meLoading } = useMe()
  const { data: myTasks = [], isLoading: tasksLoading } = useMyTasks()
  const updateStatus = useUpdateMyStatus()

  const now = new Date()
  const { data: monthData } = useMonthData(now.getFullYear(), now.getMonth() + 1)

  const [editingStatus, setEditingStatus] = useState(false)
  const [noteInput, setNoteInput] = useState('')
  const [workingTaskId, setWorkingTaskId] = useState<string>('none')

  const activeTasks   = myTasks.filter((task) => task.status !== 'DONE')
  const workingOnTask = myTasks.find((task) => task.id === me?.workingOnTaskId)

  // The work-days endpoint no longer reports task completion counts (that
  // coupling was removed in the work-day status rework) — derive it from the
  // tasks we already have instead of adding a new backend dependency.
  const completedThisMonth = myTasks.filter((task) => {
    if (task.status !== 'DONE') return false
    const d = new Date(task.updatedAt)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

  const handleSaveStatus = async () => {
    await updateStatus.mutateAsync({
      workingOnTaskId: workingTaskId !== 'none' ? Number(workingTaskId) : null,
      statusNote: noteInput.trim() || undefined,
    })
    setEditingStatus(false)
  }

  const openEdit = () => {
    setNoteInput(me?.statusNote ?? '')
    setWorkingTaskId(me?.workingOnTaskId ? String(me.workingOnTaskId) : 'none')
    setEditingStatus(true)
  }

  if (meLoading || tasksLoading) {
    return (
      <main className="flex items-center justify-center p-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-semibold">
          {me?.fullName[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-semibold">{me?.fullName}</h1>
          <p className="text-sm text-muted-foreground">{me?.occupation ?? me?.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: t('me.completedThisMonth'), value: completedThisMonth },
          { label: t('me.salaryLabel'),        value: me?.salary != null ? `${Number(me.salary).toLocaleString('uk-UA')} ₴` : '—' },
          { label: t('me.daysOffThisMonth'),   value: monthData?.stats.daysOff ?? '—' },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="pb-4 pt-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-2xl font-semibold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Working on */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{t('me.workingOn')}</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs" onClick={openEdit}>
              <Pencil className="size-3" />
              {t('me.update')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {editingStatus ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{t('me.currentTask')}</Label>
                <Select value={workingTaskId} onValueChange={setWorkingTaskId}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={t('me.selectTask')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— {t('me.none')} —</SelectItem>
                    {activeTasks.map((task) => (
                      <SelectItem key={task.id} value={String(task.id)}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">{t('me.statusNote')}</Label>
                <input
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder={t('me.statusNotePlaceholder')}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveStatus} disabled={updateStatus.isPending}>
                  {updateStatus.isPending
                    ? <Loader2 className="size-3.5 animate-spin" />
                    : t('me.save')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingStatus(false)}>
                  {t('dashboard.team.cancel')}
                </Button>
              </div>
            </div>
          ) : workingOnTask || me?.statusNote ? (
            <div className="flex flex-col gap-1">
              {workingOnTask && (
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[workingOnTask.status]}`}>
                    {STATUS_LABEL[workingOnTask.status]}
                  </span>
                  <p className="text-sm font-medium">{workingOnTask.title}</p>
                </div>
              )}
              {me?.statusNote && (
                <p className="text-sm text-muted-foreground">{me.statusNote}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('me.notSet')}</p>
          )}
        </CardContent>
      </Card>

      {/* Active tasks */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">
          {t('me.activeTasks')}{' '}
          <span className="font-normal text-muted-foreground">({activeTasks.length})</span>
        </h2>
        {activeTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('me.noActiveTasks')}</p>
        ) : (
          <TaskAccordion tasks={activeTasks} />
        )}
      </div>
    </main>
  )
}

function TaskAccordion({ tasks }: { tasks: Task[] }) {
  return (
    <Card>
      <Accordion type="multiple" className="divide-y divide-border">
        {tasks.map((task) => (
          <AccordionItem key={task.id} value={String(task.id)} className="border-0">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40 transition-colors [&>svg]:shrink-0">
              <div className="flex flex-1 items-center justify-between gap-4 min-w-0 mr-2">
                <span className="truncate text-sm font-medium text-left">{task.title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <Flag className={`size-3 ${PRIORITY_COLOR[task.priority]}`} />
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[task.status]}`}>
                    {STATUS_LABEL[task.status]}
                  </span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-3 pt-0">
              <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                <p className="text-xs font-medium text-foreground/60">{task.board.title}</p>
                {task.description && <p className="text-xs">{task.description}</p>}
                <div className="flex items-center gap-4 mt-1">
                  {task.endDate && (
                    <div className="flex items-center gap-1 text-xs">
                      <Calendar className="size-3" />
                      {new Date(task.endDate).toLocaleDateString('uk-UA', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </div>
                  )}
                  {(task.estimate || task.estimateHours) && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                      {task.estimate ?? `${task.estimateHours}h`}
                    </span>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  )
}
