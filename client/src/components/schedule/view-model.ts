import type { MonthData, WorkDay } from '#/lib/workdays/types'
import { toKey } from './date-utils'

export interface DayMaps {
  workDayMap: Map<string, WorkDay>
}

/** Merge any number of range payloads into a day-keyed lookup. */
export function buildDayMaps(datasets: (MonthData | undefined)[]): DayMaps {
  const workDayMap = new Map<string, WorkDay>()
  for (const data of datasets) {
    for (const wd of data?.workDays ?? []) workDayMap.set(toKey(wd.date), wd)
  }
  return { workDayMap }
}

/** Resolve a day's exception status, if any. Days with no record are regular working days. */
export function resolveDay(date: Date, maps: DayMaps) {
  const key = toKey(date.toISOString())
  const workDay = maps.workDayMap.get(key)
  return { key, workDay, status: workDay?.status, confirmed: Boolean(workDay) }
}

export interface ViewProps {
  maps: DayMaps
  todayKey: string
  locale: string
  onSelectDay: (d: Date) => void
}
