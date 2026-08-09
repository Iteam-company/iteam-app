export function toKey(iso: string) { return iso.slice(0, 10) }

/** Every date in this file is built at UTC midnight, so read it back in UTC. */
export function utcDay(year: number, month1: number, day: number) {
  return new Date(Date.UTC(year, month1 - 1, day))
}

export function todayUTC() {
  const n = new Date()
  return utcDay(n.getFullYear(), n.getMonth() + 1, n.getDate())
}

/** Mon-based index: 0=Mon … 6=Sun */
export function dowIndex(date: Date) {
  return (date.getUTCDay() + 6) % 7
}

export function addDays(date: Date, n: number) {
  const d = new Date(date.getTime())
  d.setUTCDate(d.getUTCDate() + n)
  return d
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: Date) {
  return addDays(date, -dowIndex(date))
}

export function daysInMonthOf(year: number, month1: number) {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate()
}

export function getDowLabel(idx: number, locale: string, style: 'short' | 'narrow' = 'short') {
  // April 13, 2026 is a Monday — use it as reference
  return new Date(Date.UTC(2026, 3, 13 + idx))
    .toLocaleDateString(locale, { weekday: style, timeZone: 'UTC' })
}

export function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

export function formatMonthYear(year: number, month: number, locale: string) {
  const name = utcDay(year, month, 1).toLocaleDateString(locale, { month: 'long', timeZone: 'UTC' })
  return capitalize(name) + ' ' + year
}

export function formatMonthShort(year: number, month: number, locale: string) {
  return capitalize(
    utcDay(year, month, 1).toLocaleDateString(locale, { month: 'short', timeZone: 'UTC' }),
  )
}

export function formatDayTitle(date: Date, locale: string) {
  return date.toLocaleDateString(locale, {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

/** "5 – 11 Aug 2026", collapsing the month when the week doesn't straddle one. */
export function formatWeekRange(start: Date, locale: string) {
  const end = addDays(start, 6)
  const sameMonth = start.getUTCMonth() === end.getUTCMonth()
  const startLabel = start.toLocaleDateString(
    locale,
    sameMonth
      ? { day: 'numeric', timeZone: 'UTC' }
      : { day: 'numeric', month: 'short', timeZone: 'UTC' },
  )
  const endLabel = end.toLocaleDateString(locale, {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
  return `${startLabel} – ${endLabel}`
}
