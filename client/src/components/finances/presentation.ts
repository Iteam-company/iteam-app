import type {
  FinanceDestinationType,
  FinanceIncomeStatus,
  FinanceNode,
} from '#/lib/finances/types'

/** Status drives the colour of an income box, per the three transfer states. */
export const STATUS_STYLE: Record<FinanceIncomeStatus, string> = {
  TRANSFERRED: 'bg-emerald-600 ring-emerald-400/40',
  PENDING: 'bg-amber-500 ring-amber-300/40',
  NOT_TRANSFERRED: 'bg-rose-600 ring-rose-400/40',
}

export const STATUS_DOT: Record<FinanceIncomeStatus, string> = {
  TRANSFERRED: 'bg-emerald-500',
  PENDING: 'bg-amber-500',
  NOT_TRANSFERRED: 'bg-rose-500',
}

/** i18n key suffix per destination type; OTHER falls back to the custom label. */
export const DESTINATION_LABEL_KEY: Record<FinanceDestinationType, string> = {
  PAYPAL: 'paypal',
  PAYONEER: 'payoneer',
  BANK_FOP: 'bankFop',
  OTHER: 'other',
}

export function nodeAmount(node: FinanceNode): number {
  return node.amount == null ? 0 : Number(node.amount)
}

/**
 * Where to drop a newly added box. Without this every box is created at the
 * origin and they stack on top of each other; laying them out in a loose grid
 * keeps each new one visible and draggable straight away.
 */
export function nextSpot(count: number) {
  const COL_W = 240
  const ROW_H = 170
  const PER_ROW = 5
  return {
    x: 40 + (count % PER_ROW) * COL_W,
    y: 40 + Math.floor(count / PER_ROW) * ROW_H,
  }
}

export function formatAmount(value: number, currency: string | null) {
  const shown = Number.isInteger(value) ? value.toString() : value.toFixed(2)
  return currency ? `${shown} ${currency}` : shown
}

/**
 * "5 Sep" for an exact date, "1–5 Sep" for a range inside one month, and
 * "28 Aug – 3 Sep" when the range crosses a month boundary.
 */
export function formatDateRange(
  from: string | null,
  to: string | null,
  locale: string,
) {
  if (!from) return null
  const start = new Date(from)
  const dayMonth = (d: Date) =>
    d.toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })

  if (!to) return dayMonth(start)

  const end = new Date(to)
  if (start.getTime() === end.getTime()) return dayMonth(start)

  if (start.getUTCMonth() === end.getUTCMonth()) {
    const startDay = start.toLocaleDateString(locale, { day: 'numeric', timeZone: 'UTC' })
    return `${startDay}–${dayMonth(end)}`
  }
  return `${dayMonth(start)} – ${dayMonth(end)}`
}

export function formatMonth(
  year: number | null,
  month: number | null,
  locale: string,
) {
  if (year == null || month == null) return null
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Short tab label — "Sep 2026". */
export function formatMonthShort(
  year: number | null,
  month: number | null,
  locale: string,
) {
  if (year == null || month == null) return null
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(locale, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
