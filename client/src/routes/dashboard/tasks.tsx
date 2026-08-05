import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Calendar, ChevronDown, Flag, GripVertical, KanbanSquare,
  List, Loader2, Plus, Trash2, User2,
} from 'lucide-react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '#/components/ui/select'
import { useMe } from '#/lib/auth/mutations'
import { useCompanyMembers } from '#/lib/company/mutations'
import {
  useBoards, useCreateBoard, useCreateTask, useDeleteTask,
  useTasks, useUpdateTaskStatus,
} from '#/lib/tasks/mutations'
import type { Board, Task, TaskPriority, TaskStatus } from '#/lib/tasks/types'

export const Route = createFileRoute('/dashboard/tasks')({ component: TasksPage, ssr: false })

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
}

const STATUS_COLOR: Record<TaskStatus, string> = {
  TODO: 'bg-muted text-muted-foreground',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-500',
  IN_REVIEW: 'bg-amber-500/10 text-amber-500',
  DONE: 'bg-emerald-500/10 text-emerald-500',
}

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW: 'text-muted-foreground',
  MEDIUM: 'text-blue-500',
  HIGH: 'text-amber-500',
  URGENT: 'text-destructive',
}

const ESTIMATE_LABEL = { S: 'S', M: 'M', L: 'L', XL: 'XL' }

// ── Page ──────────────────────────────────────────────────────────────────────

function TasksPage() {
  const { t } = useTranslation()
  const { data: me } = useMe()
  const { data: boards = [], isLoading: boardsLoading } = useBoards()

  const [activeBoardId, setActiveBoardId] = useState<number | undefined>(undefined)
  const [view, setView] = useState<'list' | 'kanban'>('kanban')
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [createBoardOpen, setCreateBoardOpen] = useState(false)

  const effectiveBoardId = activeBoardId ?? boards[0]?.id

  const { data: tasksPage, isLoading: tasksLoading } = useTasks(
    effectiveBoardId ? { boardId: effectiveBoardId, limit: 100 } : { limit: 100 },
  )
  const tasks = tasksPage?.data ?? []

  if (boardsLoading) {
    return (
      <main className="flex items-center justify-center p-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    )
  }

  return (
    <main className="flex flex-col h-[calc(100vh-0px)] overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-3 shrink-0">
        {/* Board tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {boards.map((b) => (
            <button
              key={b.id}
              onClick={() => setActiveBoardId(b.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                effectiveBoardId === b.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <BoardTypeIcon type={b.type} />
              {b.title}
              <span className="ml-1 text-xs opacity-60">{b._count.tasks}</span>
            </button>
          ))}
          <Button
            variant="ghost" size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => setCreateBoardOpen(true)}
          >
            <Plus className="size-3.5" />
            {t('tasks.newBoard')}
          </Button>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* View toggle */}
          <div className="flex items-center rounded-md border border-border p-0.5">
            <button
              onClick={() => setView('kanban')}
              className={`rounded p-1.5 transition-colors ${view === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <KanbanSquare className="size-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`rounded p-1.5 transition-colors ${view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <List className="size-4" />
            </button>
          </div>

          <Button size="sm" className="gap-2" onClick={() => setCreateTaskOpen(true)}>
            <Plus className="size-4" />
            {t('tasks.newTask')}
          </Button>
        </div>
      </div>

      {/* Content */}
      {tasksLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : view === 'kanban' ? (
        <KanbanView tasks={tasks} meId={me?.id} />
      ) : (
        <ListView tasks={tasks} meId={me?.id} />
      )}

      {/* Modals */}
      {createTaskOpen && (
        <CreateTaskModal
          boards={boards}
          defaultBoardId={effectiveBoardId}
          onClose={() => setCreateTaskOpen(false)}
        />
      )}
      {createBoardOpen && (
        <CreateBoardModal onClose={() => setCreateBoardOpen(false)} />
      )}
    </main>
  )
}

// ── Board type icon ───────────────────────────────────────────────────────────

function BoardTypeIcon({ type }: { type: Board['type'] }) {
  if (type === 'KANBAN') return <KanbanSquare className="size-3.5" />
  if (type === 'LIST') return <List className="size-3.5" />
  return <ChevronDown className="size-3.5" /> // SCRUM
}

// ── Kanban view ───────────────────────────────────────────────────────────────

function KanbanView({ tasks, meId }: { tasks: Task[]; meId?: number }) {
  const updateStatus = useUpdateTaskStatus()
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const columns = STATUSES.map((s) => ({
    status: s,
    tasks: tasks.filter((t) => t.status === s),
  }))

  function handleDragStart({ active }: DragStartEvent) {
    setActiveTask(tasks.find((t) => t.id === Number(active.id)) ?? null)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTask(null)
    if (!over) return
    const taskId = Number(active.id)
    const newStatus = over.id as TaskStatus
    const task = tasks.find((t) => t.id === taskId)
    if (task && task.status !== newStatus) {
      updateStatus.mutate({ id: taskId, status: newStatus })
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-1 gap-4 overflow-x-auto p-4">
        {columns.map(({ status, tasks: colTasks }) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={colTasks}
            meId={meId}
            activeTaskId={activeTask?.id}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <TaskCard
            task={activeTask}
            meId={meId}
            onStatusChange={() => {}}
            isOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}

// ── Kanban column (droppable) ─────────────────────────────────────────────────

function KanbanColumn({
  status, tasks, meId, activeTaskId,
}: {
  status: TaskStatus
  tasks: Task[]
  meId?: number
  activeTaskId?: number
}) {
  const updateStatus = useUpdateTaskStatus()
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2">
      {/* Column header */}
      <div className="flex items-center gap-2 px-1">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[status]}`}>
          {STATUS_LABEL[status]}
        </span>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex min-h-24 flex-col gap-2 overflow-y-auto rounded-lg p-2 transition-colors ${
          isOver ? 'bg-primary/8 ring-2 ring-primary/25' : 'bg-muted/30'
        }`}
      >
        {tasks.map((task) => (
          task.id !== activeTaskId ? (
            <DraggableTaskCard
              key={task.id}
              task={task}
              meId={meId}
              onStatusChange={(s) => updateStatus.mutate({ id: task.id, status: s })}
            />
          ) : (
            // Ghost placeholder while dragging
            <div key={task.id} className="rounded-md border border-dashed border-border bg-muted/20 h-24 opacity-50" />
          )
        ))}
        {tasks.length === 0 && !isOver && (
          <p className="py-6 text-center text-xs text-muted-foreground">Empty</p>
        )}
      </div>
    </div>
  )
}

// ── Draggable task card wrapper ───────────────────────────────────────────────

function DraggableTaskCard({
  task, meId, onStatusChange,
}: {
  task: Task
  meId?: number
  onStatusChange: (s: TaskStatus) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id.toString(),
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={isDragging ? 'opacity-0' : ''}
    >
      <TaskCard
        task={task}
        meId={meId}
        onStatusChange={onStatusChange}
        dragListeners={listeners}
      />
    </div>
  )
}

// ── List view ─────────────────────────────────────────────────────────────────

function ListView({ tasks, meId }: { tasks: Task[]; meId?: number }) {
  const { t } = useTranslation()
  const updateStatus = useUpdateTaskStatus()
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)

  if (!tasks.length) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        {t('tasks.noTasks')}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <Card>
        {/* Header */}
        <div className="grid grid-cols-[1fr_140px_100px_100px_120px_36px] items-center gap-3 border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
          <span>{t('tasks.title')}</span>
          <span>{t('tasks.assignees')}</span>
          <span>{t('tasks.status')}</span>
          <span>{t('tasks.priority')}</span>
          <span>{t('tasks.dueDate')}</span>
          <span />
        </div>
        <div className="divide-y divide-border">
          {tasks.map((task) => (
            <div key={task.id} className="grid grid-cols-[1fr_140px_100px_100px_120px_36px] items-center gap-3 px-4 py-2.5">
              {/* Title + estimate */}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{task.title}</p>
                {task.description && (
                  <p className="truncate text-xs text-muted-foreground">{task.description}</p>
                )}
              </div>

              {/* Assignees */}
              <div className="flex -space-x-1.5">
                {task.assignees.slice(0, 4).map((a) => (
                  <div
                    key={a.userId}
                    title={a.user.fullName}
                    className={`flex size-6 items-center justify-center rounded-full text-[10px] font-semibold ring-2 ring-background ${a.userId === meId ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-foreground'}`}
                  >
                    {a.user.fullName[0]?.toUpperCase()}
                  </div>
                ))}
                {task.assignees.length > 4 && (
                  <div className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] ring-2 ring-background">
                    +{task.assignees.length - 4}
                  </div>
                )}
              </div>

              {/* Status */}
              <Select
                value={task.status}
                onValueChange={(v) => updateStatus.mutate({ id: task.id, status: v as TaskStatus })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Priority */}
              <div className="flex items-center gap-1">
                <Flag className={`size-3 ${PRIORITY_COLOR[task.priority]}`} />
                <span className="text-xs capitalize">{task.priority.toLowerCase()}</span>
              </div>

              {/* Due date */}
              <div className="text-xs text-muted-foreground">
                {task.endDate
                  ? new Date(task.endDate).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short' })
                  : '—'}
              </div>

              {/* Delete */}
              <Button
                variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive"
                onClick={() => setTaskToDelete(task)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {taskToDelete && (
        <DeleteTaskModal task={taskToDelete} onClose={() => setTaskToDelete(null)} />
      )}
    </div>
  )
}

// ── Task card (Kanban) ────────────────────────────────────────────────────────

function TaskCard({
  task, meId, onStatusChange, dragListeners, isOverlay,
}: {
  task: Task
  meId?: number
  onStatusChange: (s: TaskStatus) => void
  dragListeners?: Record<string, unknown>
  isOverlay?: boolean
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <>
      <div className={`group relative rounded-md border border-border bg-card p-3 shadow-sm transition-colors ${isOverlay ? 'shadow-xl rotate-1 cursor-grabbing' : 'hover:border-primary/40'}`}>
        {/* Title row */}
        <div className="flex items-start gap-1.5 mb-2">
          {/* Drag handle */}
          <button
            {...dragListeners}
            className="mt-0.5 shrink-0 cursor-grab text-muted-foreground/40 hover:text-muted-foreground transition-colors active:cursor-grabbing"
            tabIndex={-1}
          >
            <GripVertical className="size-3.5" />
          </button>
          <p className="flex-1 text-sm font-medium leading-snug line-clamp-2">{task.title}</p>
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{task.description}</p>
      )}

      {/* Meta row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Priority */}
          <Flag className={`size-3 ${PRIORITY_COLOR[task.priority]}`} />

          {/* Estimate */}
          {(task.estimate || task.estimateHours) && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {task.estimate ? ESTIMATE_LABEL[task.estimate] : `${task.estimateHours}h`}
            </span>
          )}

          {/* Due date */}
          {task.endDate && (
            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Calendar className="size-3" />
              {new Date(task.endDate).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short' })}
            </div>
          )}
        </div>

        {/* Assignee avatars */}
        <div className="flex -space-x-1.5">
          {task.assignees.slice(0, 3).map((a) => (
            <div
              key={a.userId}
              title={a.user.fullName}
              className={`flex size-5 items-center justify-center rounded-full text-[9px] font-semibold ring-1 ring-card ${a.userId === meId ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/30'}`}
            >
              {a.user.fullName[0]?.toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* Quick status change */}
      <div className="mt-2 border-t border-border pt-2">
        <Select value={task.status} onValueChange={(v) => onStatusChange(v as TaskStatus)}>
          <SelectTrigger className="h-6 text-[10px] border-0 bg-transparent p-0 shadow-none focus:ring-0">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[task.status]}`}>
              {STATUS_LABEL[task.status]}
            </span>
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>

      {confirmDelete && (
        <DeleteTaskModal
          task={task}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </>
  )
}

// ── Delete task modal ─────────────────────────────────────────────────────────

function DeleteTaskModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const { t } = useTranslation()
  const deleteTask = useDeleteTask()

  const handleDelete = async () => {
    await deleteTask.mutateAsync(task.id)
    onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('tasks.deleteTitle')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t('tasks.deleteMessage', { title: task.title })}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('tasks.deleteCancel')}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteTask.isPending}>
            {deleteTask.isPending ? <Loader2 className="size-4 animate-spin" /> : t('tasks.deleteConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Create task modal ─────────────────────────────────────────────────────────

function CreateTaskModal({
  boards,
  defaultBoardId,
  onClose,
}: {
  boards: Board[]
  defaultBoardId?: number
  onClose: () => void
}) {
  const { t } = useTranslation()
  const createTask = useCreateTask()
  const { data: members } = useCompanyMembers({ limit: 100 })
  const memberList = members?.data ?? []

  const [boardId, setBoardId] = useState<number | undefined>(defaultBoardId ?? boards[0]?.id)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM')
  const [estimate, setEstimate] = useState('')
  const [estimateHours, setEstimateHours] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [assigneeIds, setAssigneeIds] = useState<number[]>([])
  const [error, setError] = useState('')

  const toggleAssignee = (id: number) =>
    setAssigneeIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !boardId) return
    setError('')
    try {
      await createTask.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        boardId,
        priority,
        estimate: (estimate as any) || undefined,
        estimateHours: estimateHours ? Number(estimateHours) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        assigneeIds: assigneeIds.length ? assigneeIds : undefined,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('tasks.newTask')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          {boards.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <Label>{t('tasks.board')}</Label>
              <Select
                value={boardId?.toString() ?? ''}
                onValueChange={(v) => setBoardId(Number(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {boards.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>{t('tasks.title')} *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" autoFocus />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t('tasks.description')}</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional description…"
              className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t('tasks.priority')}</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t('tasks.estimate')}</Label>
              <div className="flex gap-2">
                <Select value={estimate || 'none'} onValueChange={(v) => setEstimate(v === 'none' ? '' : v)}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Size" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {(['S', 'M', 'L', 'XL']).map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number" min={0} step={0.5}
                  value={estimateHours}
                  onChange={(e) => setEstimateHours(e.target.value)}
                  placeholder="h"
                  className="w-16"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t('tasks.startDate')}</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('tasks.dueDate')}</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t('tasks.assignees')}</Label>
            <div className="flex flex-wrap gap-2">
              {memberList.map((m) => {
                const selected = assigneeIds.includes(m.id)
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleAssignee(m.id)}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <User2 className="size-3" />
                    {m.fullName}
                  </button>
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t('dashboard.team.cancel')}</Button>
            <Button type="submit" disabled={createTask.isPending || !title.trim() || !boardId}>
              {createTask.isPending ? <Loader2 className="size-4 animate-spin" /> : t('tasks.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Create board modal ────────────────────────────────────────────────────────

function CreateBoardModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const createBoard = useCreateBoard()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<Board['type']>('KANBAN')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    await createBoard.mutateAsync({ title: title.trim(), type })
    onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('tasks.newBoard')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>{t('tasks.boardTitle')}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="Board name" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('tasks.boardType')}</Label>
            <Select value={type} onValueChange={(v) => setType(v as Board['type'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="KANBAN">Kanban</SelectItem>
                <SelectItem value="LIST">List</SelectItem>
                <SelectItem value="SCRUM">Scrum</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t('dashboard.team.cancel')}</Button>
            <Button type="submit" disabled={createBoard.isPending || !title.trim()}>
              {createBoard.isPending ? <Loader2 className="size-4 animate-spin" /> : t('tasks.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
