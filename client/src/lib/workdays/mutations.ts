import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { workDaysApi } from './api'
import type { UpsertWorkDayRequest } from './types'

export const WORK_DAYS_ROOT = ['work-days'] as const

export const workDayKey = (year: number, month: number) => ['work-days', year, month] as const
export const workYearKey = (year: number) => ['work-days', year, 'all'] as const

export function useMonthData(year: number, month: number, enabled = true) {
  return useQuery({
    queryKey: workDayKey(year, month),
    queryFn: () => workDaysApi.getMonth(year, month),
    retry: false,
    enabled,
  })
}

/** All 12 months at once, for the zoomed-out year view. */
export function useYearData(year: number, enabled = true) {
  return useQuery({
    queryKey: workYearKey(year),
    queryFn: () => workDaysApi.getYear(year),
    retry: false,
    enabled,
  })
}

export function useUpsertWorkDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ date, ...body }: UpsertWorkDayRequest & { date: string }) =>
      workDaysApi.upsertDay(date, body),
    // Invalidate the whole tree: an edited day shows up in the month, the
    // neighbouring week (weeks straddle months) and the year roll-up alike.
    onSuccess: () => qc.invalidateQueries({ queryKey: WORK_DAYS_ROOT }),
  })
}

export function useRemoveWorkDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (date: string) => workDaysApi.removeDay(date),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORK_DAYS_ROOT }),
  })
}
