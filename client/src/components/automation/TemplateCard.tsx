import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { TEMPLATES } from './mock-data';
import { CATEGORY_COLOR } from './mock-data'

export function TemplateCard({ tpl }: { tpl: typeof TEMPLATES[number] }) {
  const { t } = useTranslation()

  return (
    <Card className="cursor-pointer hover:border-muted-foreground/30 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm">{tpl.name}</CardTitle>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORY_COLOR[tpl.category]}`}>
            {t(`dashboard.automation.category.${tpl.category}`)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-3 text-xs text-muted-foreground">{tpl.preview}</p>
        <Button variant="ghost" size="sm" className="mt-3 h-7 w-full gap-1 text-xs">
          {t('dashboard.automation.useTemplate')}
          <ChevronRight className="size-3" />
        </Button>
      </CardContent>
    </Card>
  )
}
