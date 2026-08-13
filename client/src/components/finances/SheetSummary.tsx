import { useTranslation } from 'react-i18next'
import type { FinanceSheet } from '#/lib/finances/types'
import { STATUS_DOT, formatAmount, nodeAmount } from './presentation'

/**
 * The three numbers the sheet exists to answer: how much is expected, how much
 * has landed, and how much is still outstanding. Amounts are grouped by
 * currency so a UAH figure is never added to a USD one.
 */
export function SheetSummary({ sheet }: { sheet: FinanceSheet }) {
  const { t } = useTranslation()

  const income = sheet.nodes.filter((n) => n.kind === 'INCOME')
  if (!income.length) return null

  const byCurrency = new Map<
    string,
    { expected: number; transferred: number; pending: number }
  >()

  for (const node of income) {
    const key = node.currency ?? '—'
    const bucket = byCurrency.get(key) ?? { expected: 0, transferred: 0, pending: 0 }
    const value = nodeAmount(node)
    bucket.expected += value
    if (node.status === 'TRANSFERRED') bucket.transferred += value
    if (node.status === 'PENDING') bucket.pending += value
    byCurrency.set(key, bucket)
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border px-4 py-2 text-xs">
      {[...byCurrency.entries()].map(([currency, totals]) => (
        <div key={currency} className="flex items-center gap-4">
          <Stat
            label={t('dashboard.finances.expected')}
            value={formatAmount(totals.expected, currency === '—' ? null : currency)}
          />
          <Stat
            label={t('dashboard.finances.status.TRANSFERRED')}
            value={formatAmount(totals.transferred, currency === '—' ? null : currency)}
            dot={STATUS_DOT.TRANSFERRED}
          />
          <Stat
            label={t('dashboard.finances.status.PENDING')}
            value={formatAmount(totals.pending, currency === '—' ? null : currency)}
            dot={STATUS_DOT.PENDING}
          />
          <Stat
            label={t('dashboard.finances.outstanding')}
            value={formatAmount(
              totals.expected - totals.transferred,
              currency === '—' ? null : currency,
            )}
            dot={STATUS_DOT.NOT_TRANSFERRED}
          />
        </div>
      ))}
    </div>
  )
}

function Stat({ label, value, dot }: { label: string; value: string; dot?: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {dot && <span className={`size-2 rounded-full ${dot}`} />}
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  )
}
