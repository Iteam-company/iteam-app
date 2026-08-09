import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '#/components/ui/card'
import { useMe } from '#/lib/auth/mutations'
import { useMonthData } from '#/lib/workdays/mutations'

export const Route = createFileRoute('/dashboard/me')({ component: MePage, ssr: false })

function MePage() {
  const { t } = useTranslation()
  const { data: me, isLoading } = useMe()

  const now = new Date()
  const { data: monthData } = useMonthData(now.getFullYear(), now.getMonth() + 1)

  if (isLoading) {
    return (
      <main className="flex items-center justify-center p-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-semibold">
          {me?.fullName[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-semibold">{me?.fullName}</h1>
          <p className="text-sm text-muted-foreground">{me?.occupation ?? me?.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:w-fit">
        {[
          { label: t('me.salaryLabel'),      value: me?.salary != null ? `${Number(me.salary).toLocaleString('uk-UA')} ₴` : '—' },
          { label: t('me.daysOffThisMonth'), value: monthData?.stats.daysOff ?? '—' },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="pb-4 pt-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-2xl font-semibold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}
