export type NotifType = 'ONBOARDING_START' | 'ONBOARDING_END' | 'PASSWORD_RESET' | 'JOB_ASSIGNED'

export interface Notification {
  id: number
  userId: number
  type: NotifType
  title: string
  body: string | null
  read: boolean
  createdAt: string
}
