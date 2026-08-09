import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '#/components/ui/card'

export function StatsCard({ daysOff }: { daysOff?: number }) {
  const { t } = useTranslation()

  return (
    <Card className="shrink-0">
      <CardContent className="pb-4 pt-4">
        <p className="text-xs text-muted-foreground">{t('me.daysOffThisMonth')}</p>
        <p className="mt-1 text-2xl font-semibold">{daysOff ?? '—'}</p>
      </CardContent>
    </Card>
  )
}
