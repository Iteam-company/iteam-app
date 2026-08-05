import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { workDaysApi } from './api'
import type { UpsertWorkDayRequest } from './types'

export const workDayKey = (year: number, month: number) => ['work-days', year, month] as const

export function useMonthData(year: number, month: number) {
  return useQuery({
    queryKey: workDayKey(year, month),
    queryFn: () => workDaysApi.getMonth(year, month),
    retry: false,
  })
}

export function useUpsertWorkDay(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ date, ...body }: UpsertWorkDayRequest & { date: string }) =>
      workDaysApi.upsertDay(date, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: workDayKey(year, month) }),
  })
}
