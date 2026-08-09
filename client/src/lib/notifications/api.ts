import { api } from '#/lib/api'
import type { Notification } from './types'

export const notificationsApi = {
  list: () => api.get<Notification[]>('/notifications'),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: number) => api.patch<unknown>(`/notifications/${id}/read`, {}),
  markAllRead: () => api.patch<{ ok: boolean }>('/notifications/read-all', {}),
}
