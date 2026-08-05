import { api } from '#/lib/api'
import type {
  AssignUsersRequest, Board, BoardWithTasks, CreateBoardRequest,
  CreateTaskRequest, MyStatus, Notification, PaginatedTasks,
  Task, TasksQuery, UpdateBoardRequest, UpdateTaskRequest,
  UpdateTaskStatusRequest,
} from './types'

function buildQs(q: Record<string, unknown>) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const boardsApi = {
  list: () => api.get<Board[]>('/boards'),
  get: (id: number) => api.get<BoardWithTasks>(`/boards/${id}`),
  create: (body: CreateBoardRequest) => api.post<Board>('/boards', body),
  update: (id: number, body: UpdateBoardRequest) => api.patch<Board>(`/boards/${id}`, body),
  remove: (id: number) => api.delete<{ deleted: boolean }>(`/boards/${id}`),
}

export const tasksApi = {
  list: (q: TasksQuery = {}) => api.get<PaginatedTasks>(`/tasks${buildQs(q)}`),
  get: (id: number) => api.get<Task>(`/tasks/${id}`),
  create: (body: CreateTaskRequest) => api.post<Task>('/tasks', body),
  update: (id: number, body: UpdateTaskRequest) => api.patch<Task>(`/tasks/${id}`, body),
  updateStatus: (id: number, body: UpdateTaskStatusRequest) =>
    api.patch<Task>(`/tasks/${id}/status`, body),
  remove: (id: number) => api.delete<{ deleted: boolean }>(`/tasks/${id}`),
  assign: (id: number, body: AssignUsersRequest) =>
    api.post<Task>(`/tasks/${id}/assignees`, body),
  unassign: (taskId: number, userId: number) =>
    api.delete<Task>(`/tasks/${taskId}/assignees/${userId}`),
  myTasks: () => api.get<Task[]>('/tasks/me'),
  updateMyStatus: (body: { workingOnTaskId?: number | null; statusNote?: string }) =>
    api.patch<MyStatus>('/tasks/me/status', body),
}

export const notificationsApi = {
  list: () => api.get<Notification[]>('/notifications'),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: number) => api.patch<unknown>(`/notifications/${id}/read`, {}),
  markAllRead: () => api.patch<{ ok: boolean }>('/notifications/read-all', {}),
}
