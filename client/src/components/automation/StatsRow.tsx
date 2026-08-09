import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'

export function StatsRow({ active, total, totalSent }: { active: number; total: number; totalSent: number }) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>{t('dashboard.automation.activeWorkflows')}</CardDescription>
          <CardTitle className="text-3xl">{active}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{t('dashboard.automation.ofTotal', { total })}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>{t('dashboard.automation.sentThisMonth')}</CardDescription>
          <CardTitle className="text-3xl">{totalSent.toLocaleString('uk-UA')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{t('dashboard.automation.acrossChannels')}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>{t('dashboard.automation.avgOpen')}</CardDescription>
          <CardTitle className="text-3xl">78%</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{t('dashboard.automation.vsLastMonth')}</p>
        </CardContent>
      </Card>
    </div>
  )
}
