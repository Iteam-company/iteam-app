import { useTranslation } from 'react-i18next'
import { LayoutTemplate, Plus, X } from 'lucide-react'
import { Button } from '#/components/ui/button'
import type { FinanceSheetSummary } from '#/lib/finances/types'
import { formatMonthShort } from './presentation'

/**
 * Excel-style tab strip along the bottom. The template is pinned on the left
 * because it is the thing every month is built from.
 */
export function SheetTabs({
  sheets,
  activeId,
  onSelect,
  onNewMonth,
  onDelete,
}: {
  sheets: FinanceSheetSummary[]
  activeId: number | null
  onSelect: (id: number) => void
  onNewMonth: () => void
  onDelete: (sheet: FinanceSheetSummary) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'uk' ? 'uk-UA' : 'en-US'

  const template = sheets.find((s) => s.kind === 'TEMPLATE')
  const months = sheets.filter((s) => s.kind === 'MONTH')

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-t border-border bg-muted/40 px-2 py-1.5">
      {template && (
        <Tab
          active={template.id === activeId}
          onClick={() => onSelect(template.id)}
        >
          <LayoutTemplate className="size-3.5" />
          {t('dashboard.finances.template')}
        </Tab>
      )}

      {template && months.length > 0 && (
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
      )}

      {months.map((sheet) => (
        <Tab
          key={sheet.id}
          active={sheet.id === activeId}
          onClick={() => onSelect(sheet.id)}
        >
          {formatMonthShort(sheet.year, sheet.month, locale)}
          <span
            role="button"
            tabIndex={0}
            aria-label={t('dashboard.finances.deleteMonth')}
            title={t('dashboard.finances.deleteMonth')}
            onClick={(e) => { e.stopPropagation(); onDelete(sheet) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onDelete(sheet) }
            }}
            className="ml-0.5 rounded-full p-0.5 opacity-0 transition-opacity hover:bg-black/10 group-hover:opacity-100 dark:hover:bg-white/20"
          >
            <X className="size-3" />
          </span>
        </Tab>
      ))}

      <Button
        variant="ghost"
        size="sm"
        className="ml-1 h-7 shrink-0 gap-1 px-2 text-xs"
        onClick={onNewMonth}
      >
        <Plus className="size-3.5" />
        {t('dashboard.finances.newMonth')}
      </Button>
    </div>
  )
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
          : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}
