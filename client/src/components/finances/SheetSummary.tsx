import { useTranslation } from 'react-i18next'
import { ArrowDownToLine, CircleDashed, Clock, Wallet } from 'lucide-react'
import { Card, CardContent } from '#/components/ui/card'
import type { FinanceSheet } from '#/lib/finances/types'
import { formatAmount, nodeAmount } from './presentation'

type Totals = { expected: number; transferred: number; pending: number }

/**
 * The four numbers the sheet exists to answer. Amounts are kept per currency
 * so a UAH figure is never added to a USD one — a card shows one line per
 * currency in play.
 */
export function SheetSummary({ sheet }: { sheet: FinanceSheet }) {
  const { t } = useTranslation()

  const income = sheet.nodes.filter((n) => n.kind === 'INCOME')
  if (!income.length) return null

  const byCurrency = new Map<string, Totals>()
  for (const node of income) {
    const key = node.currency ?? '—'
    const bucket = byCurrency.get(key) ?? { expected: 0, transferred: 0, pending: 0 }
    const value = nodeAmount(node)
    bucket.expected += value
    if (node.status === 'TRANSFERRED') bucket.transferred += value
    if (node.status === 'PENDING') bucket.pending += value
    byCurrency.set(key, bucket)
  }

  const currencies = [...byCurrency.entries()]
  const line = (pick: (t: Totals) => number) =>
    currencies.map(([currency, totals]) => ({
      currency,
      text: formatAmount(pick(totals), currency === '—' ? null : currency),
    }))

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        icon={<Wallet className="size-4" />}
        label={t('dashboard.finances.expected')}
        values={line((x) => x.expected)}
      />
      <StatCard
        icon={<ArrowDownToLine className="size-4" />}
        label={t('dashboard.finances.status.TRANSFERRED')}
        values={line((x) => x.transferred)}
        accent="text-emerald-600 dark:text-emerald-400"
        iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      />
      <StatCard
        icon={<Clock className="size-4" />}
        label={t('dashboard.finances.status.PENDING')}
        values={line((x) => x.pending)}
        accent="text-amber-600 dark:text-amber-400"
        iconClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
      />
      <StatCard
        icon={<CircleDashed className="size-4" />}
        label={t('dashboard.finances.outstanding')}
        values={line((x) => x.expected - x.transferred)}
        accent="text-rose-600 dark:text-rose-400"
        iconClass="bg-rose-500/10 text-rose-600 dark:text-rose-400"
      />
    </div>
  )
}

function StatCard({
  icon,
  label,
  values,
  accent,
  iconClass = 'bg-muted text-muted-foreground',
}: {
  icon: React.ReactNode
  label: string
  values: { currency: string; text: string }[]
  accent?: string
  iconClass?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          {values.map(({ currency, text }) => (
            <p
              key={currency}
              className={`truncate text-xl font-semibold tabular-nums leading-tight ${accent ?? ''}`}
            >
              {text}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
