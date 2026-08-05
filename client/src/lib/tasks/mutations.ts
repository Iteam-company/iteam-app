import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { boardsApi, notificationsApi, tasksApi } from './api'
import type {
  AssignUsersRequest, CreateBoardRequest, CreateTaskRequest,
  TasksQuery, UpdateBoardRequest, UpdateTaskRequest,
  UpdateTaskStatusRequest,
} from './types'

// ── Keys ──────────────────────────────────────────────────────────────────────

export const BOARDS_KEY = ['boards'] as const
export const TASKS_KEY  = ['tasks'] as const
export const MY_TASKS_KEY = ['tasks', 'me'] as const
export const NOTIFS_KEY = ['notifications'] as const
export const NOTIFS_COUNT_KEY = ['notifications', 'count'] as const

// ── Boards ────────────────────────────────────────────────────────────────────

export function useBoards() {
  return useQuery({ queryKey: BOARDS_KEY, queryFn: boardsApi.list, retry: false })
}

export function useBoard(id: number | undefined) {
  return useQuery({
    queryKey: [...BOARDS_KEY, id],
    queryFn: () => boardsApi.get(id!),
    enabled: id !== undefined,
    retry: false,
  })
}

export function useCreateBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateBoardRequest) => boardsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: BOARDS_KEY }),
  })
}

export function useUpdateBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateBoardRequest & { id: number }) =>
      boardsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: BOARDS_KEY }),
  })
}

export function useDeleteBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => boardsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: BOARDS_KEY }),
  })
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export function useTasks(query: TasksQuery = {}) {
  return useQuery({
    queryKey: [...TASKS_KEY, query],
    queryFn: () => tasksApi.list(query),
    retry: false,
    placeholderData: (prev) => prev,
  })
}

export function useTask(id: number | undefined) {
  return useQuery({
    queryKey: [...TASKS_KEY, id],
    queryFn: () => tasksApi.get(id!),
    enabled: id !== undefined,
    retry: false,
  })
}

export function useMyTasks() {
  return useQuery({
    queryKey: MY_TASKS_KEY,
    queryFn: tasksApi.myTasks,
    retry: false,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateTaskRequest) => tasksApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY })
      qc.invalidateQueries({ queryKey: BOARDS_KEY })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateTaskRequest & { id: number }) =>
      tasksApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  })
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateTaskStatusRequest & { id: number }) =>
      tasksApi.updateStatus(id, body),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: TASKS_KEY })
      const snapshots = qc.getQueriesData({ queryKey: TASKS_KEY })
      qc.setQueriesData({ queryKey: TASKS_KEY }, (old: any) => {
        if (!old?.data) return old
        return { ...old, data: old.data.map((t: any) => t.id === id ? { ...t, status } : t) }
      })
      return { snapshots }
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => tasksApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY })
      qc.invalidateQueries({ queryKey: BOARDS_KEY })
    },
  })
}

export function useAssignUsers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, ...body }: AssignUsersRequest & { taskId: number }) =>
      tasksApi.assign(taskId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  })
}

export function useUnassignUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, userId }: { taskId: number; userId: number }) =>
      tasksApi.unassign(taskId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  })
}

export function useUpdateMyStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tasksApi.updateMyStatus,
    onSuccess: () => qc.invalidateQueries({ queryKey: MY_TASKS_KEY }),
  })
}

// ── Notifications ─────────────────────────────────────────────────────────────

export function useNotifications() {
  return useQuery({
    queryKey: NOTIFS_KEY,
    queryFn: notificationsApi.list,
    refetchInterval: 30_000, // poll every 30s
    retry: false,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: NOTIFS_COUNT_KEY,
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30_000,
    retry: false,
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFS_KEY })
      qc.invalidateQueries({ queryKey: NOTIFS_COUNT_KEY })
    },
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFS_KEY })
      qc.invalidateQueries({ queryKey: NOTIFS_COUNT_KEY })
    },
  })
}
