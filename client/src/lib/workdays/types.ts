export type WorkDayStatus = 'WORKING' | 'WEEKEND' | 'SICK_LEAVE' | 'VACATION'

export interface WorkDay {
  id: number
  userId: number
  date: string        // ISO date string "2025-04-15T00:00:00.000Z"
  status: WorkDayStatus
  startTime: string | null
  endTime: string | null
}

export interface CompletedTask {
  id: number
  title: string
  description: string | null
  priority: string
  updatedAt: string   // used as completedAt proxy
  board: { title: string }
}

export interface MonthStats {
  workingDays: number
  totalHours: number
  completedCount: number
}

export interface MonthData {
  workDays: WorkDay[]
  completedTasks: CompletedTask[]
  stats: MonthStats
}

export interface UpsertWorkDayRequest {
  status: WorkDayStatus
  startTime?: string
  endTime?: string
}
