// Kept in sync with server/src/work-days/dto/work-day.dto.ts.
// A date with no WorkDay record is an implicit regular working day — only
// exceptions (days off, leave, holidays) are stored.
export type WorkDayStatus =
  | 'WEEKEND_PAID'
  | 'WEEKEND_UNPAID'
  | 'SICK_LEAVE_PAID'
  | 'SICK_LEAVE_UNPAID'
  | 'VACATION'
  | 'HOLIDAY'

export interface WorkDay {
  id: number
  userId: number
  date: string        // ISO date string "2025-04-15T00:00:00.000Z"
  status: WorkDayStatus
}

export interface MonthStats {
  daysOff: number
}

export interface MonthData {
  workDays: WorkDay[]
  stats: MonthStats
}

export interface UpsertWorkDayRequest {
  status: WorkDayStatus
}
