import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from './api'

export const NOTIFS_KEY = ['notifications'] as const
export const NOTIFS_COUNT_KEY = ['notifications', 'count'] as const

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
