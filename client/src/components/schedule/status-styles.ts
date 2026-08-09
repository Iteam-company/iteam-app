import type { WorkDayStatus } from '#/lib/workdays/types'

// A date with no WorkDay record is an implicit regular working day — there is
// no "WORKING" status anymore, only exceptions. Colors below only apply to
// confirmed (recorded) exceptions; unmarked days render neutrally.

export const STATUS_ORDER: WorkDayStatus[] = [
  'WEEKEND_PAID', 'WEEKEND_UNPAID',
  'SICK_LEAVE_PAID', 'SICK_LEAVE_UNPAID',
  'VACATION', 'HOLIDAY',
]

export const STATUS_LABEL_KEY: Record<WorkDayStatus, string> = {
  WEEKEND_PAID: 'me.statusWeekendPaid',
  WEEKEND_UNPAID: 'me.statusWeekendUnpaid',
  SICK_LEAVE_PAID: 'me.statusSickLeavePaid',
  SICK_LEAVE_UNPAID: 'me.statusSickLeaveUnpaid',
  VACATION: 'me.statusVacation',
  HOLIDAY: 'me.statusHoliday',
}

export const STATUS_BG: Record<WorkDayStatus, string> = {
  WEEKEND_PAID: 'bg-amber-400/25',
  WEEKEND_UNPAID: 'bg-amber-600/25',
  SICK_LEAVE_PAID: 'bg-rose-500/20',
  SICK_LEAVE_UNPAID: 'bg-rose-700/20',
  VACATION: 'bg-emerald-500/20',
  HOLIDAY: 'bg-violet-500/20',
}

export const STATUS_SOLID: Record<WorkDayStatus, string> = {
  WEEKEND_PAID: 'bg-amber-400',
  WEEKEND_UNPAID: 'bg-amber-600',
  SICK_LEAVE_PAID: 'bg-rose-500',
  SICK_LEAVE_UNPAID: 'bg-rose-700',
  VACATION: 'bg-emerald-500',
  HOLIDAY: 'bg-violet-500',
}

export const STATUS_BADGE: Record<WorkDayStatus, string> = {
  WEEKEND_PAID: 'bg-amber-400/10 text-amber-600 dark:text-amber-400',
  WEEKEND_UNPAID: 'bg-amber-600/10 text-amber-700 dark:text-amber-500',
  SICK_LEAVE_PAID: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  SICK_LEAVE_UNPAID: 'bg-rose-700/10 text-rose-700 dark:text-rose-500',
  VACATION: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  HOLIDAY: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
}

/** Neutral treatment for a day with no exception record. */
export const NEUTRAL_DOT = 'bg-muted-foreground/20'
