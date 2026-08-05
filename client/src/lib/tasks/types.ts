export type BoardType = 'LIST' | 'KANBAN' | 'SCRUM'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TaskEstimate = 'S' | 'M' | 'L' | 'XL'

// ── Board ─────────────────────────────────────────────────────────────────────

export interface Board {
  id: number
  title: string
  type: BoardType
  companyId: number
  createdById: number
  createdBy: { id: number; fullName: string }
  _count: { tasks: number }
  createdAt: string
  updatedAt: string
}

export interface BoardWithTasks extends Board {
  tasks: Task[]
}

// ── Task ──────────────────────────────────────────────────────────────────────

export interface TaskAssignee {
  userId: number
  assignedAt: string
  user: { id: number; fullName: string; occupation: string | null }
}

export interface Task {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  estimate: TaskEstimate | null
  estimateHours: number | null
  startDate: string | null
  endDate: string | null
  boardId: number
  companyId: number
  createdById: number
  createdBy: { id: number; fullName: string }
  board: { id: number; title: string; type: BoardType }
  assignees: TaskAssignee[]
  createdAt: string
  updatedAt: string
}

export interface PaginatedTasks {
  data: Task[]
  meta: {
    page: number; limit: number; total: number
    totalPages: number; hasPrevious: boolean; hasNext: boolean
  }
}

// ── Requests ──────────────────────────────────────────────────────────────────

export interface CreateBoardRequest { title: string; type?: BoardType }
export interface UpdateBoardRequest { title?: string; type?: BoardType }

export interface CreateTaskRequest {
  title: string
  description?: string
  boardId: number
  priority?: TaskPriority
  estimate?: TaskEstimate
  estimateHours?: number
  startDate?: string
  endDate?: string
  assigneeIds?: number[]
}
export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {}
export interface UpdateTaskStatusRequest { status: TaskStatus }
export interface AssignUsersRequest { userIds: number[] }

export interface TasksQuery {
  page?: number
  limit?: number
  search?: string
  boardId?: number
  status?: TaskStatus
  assigneeId?: number
  priority?: TaskPriority
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotifType = 'TASK_ASSIGNED' | 'TASK_UNASSIGNED' | 'TASK_STATUS_CHANGED' | 'TASK_UPDATED'

export interface Notification {
  id: number
  userId: number
  type: NotifType
  title: string
  body: string | null
  read: boolean
  taskId: number | null
  task: { id: number; title: string } | null
  createdAt: string
}

// ── Me / Status ───────────────────────────────────────────────────────────────

export interface MyStatus {
  id: number
  workingOnTaskId: number | null
  statusNote: string | null
  workingOnTask: { id: number; title: string; status: TaskStatus } | null
}
