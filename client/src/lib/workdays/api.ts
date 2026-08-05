import { api } from '#/lib/api'
import type { MonthData, UpsertWorkDayRequest, WorkDay } from './types'

export const workDaysApi = {
  getMonth: (year: number, month: number) =>
    api.get<MonthData>(`/work-days?year=${year}&month=${month}`),
  /** Whole year in one request — used by the zoomed-out year view. */
  getYear: (year: number) => api.get<MonthData>(`/work-days?year=${year}`),
  upsertDay: (date: string, body: UpsertWorkDayRequest) =>
    api.put<WorkDay>(`/work-days/${date}`, body),
}
