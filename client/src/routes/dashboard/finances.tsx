import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Banknote, ChevronDown, Loader2, Plus, StickyNote, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { ConfirmDeleteModal } from '#/components/finances/ConfirmDeleteModal'
import { NewMonthModal } from '#/components/finances/NewMonthModal'
import { NodeModal } from '#/components/finances/NodeModal'
import { SheetCanvas } from '#/components/finances/SheetCanvas'
import { SheetSummary } from '#/components/finances/SheetSummary'
import { SheetTabs } from '#/components/finances/SheetTabs'
import { formatMonth } from '#/components/finances/presentation'
import {
  useDeleteNode,
  useDeleteSheet,
  useFinanceSheet,
  useFinanceSheets,
  useFinanceTemplate,
} from '#/lib/finances/mutations'
import type {
  FinanceNode,
  FinanceNodeKind,
  FinanceSheetSummary,
} from '#/lib/finances/types'

export const Route = createFileRoute('/dashboard/finances')({
  component: FinancesPage,
  ssr: false,
})

function FinancesPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'uk' ? 'uk-UA' : 'en-US'

  // Fetching the template also creates it the first time anyone opens the page.
  const { isLoading: templateLoading } = useFinanceTemplate()
  const {
    data: sheets = [],
    isLoading: sheetsLoading,
    isFetching: sheetsFetching,
    error,
  } = useFinanceSheets()

  const [activeId, setActiveId] = useState<number | null>(null)
  const { data: sheet, isLoading: sheetLoading } = useFinanceSheet(activeId ?? undefined)

  const deleteNode = useDeleteNode()
  const deleteSheet = useDeleteSheet()

  const [adding, setAdding] = useState<FinanceNodeKind | null>(null)
  const [editing, setEditing] = useState<FinanceNode | null>(null)
  const [deletingNode, setDeletingNode] = useState<FinanceNode | null>(null)
  const [deletingSheet, setDeletingSheet] = useState<FinanceSheetSummary | null>(null)
  const [newMonthOpen, setNewMonthOpen] = useState(false)

  // Land on the newest month, or the template when no month exists yet.
  useEffect(() => {
    if (activeId != null || !sheets.length) return
    const newest = sheets.find((s) => s.kind === 'MONTH')
    setActiveId(newest?.id ?? sheets[0].id)
  }, [sheets, activeId])

  // Keep a valid tab selected after the active sheet is deleted. Skipped while
  // the list is refetching: a month selected the moment it was created is not
  // in the cached list yet, and resetting here would bounce off it.
  useEffect(() => {
    if (sheetsFetching || activeId == null || !sheets.length) return
    if (!sheets.some((s) => s.id === activeId)) setActiveId(sheets[0].id)
  }, [sheets, activeId, sheetsFetching])

  const active = useMemo(
    () => sheets.find((s) => s.id === activeId) ?? null,
    [sheets, activeId],
  )

  // Stable identity: this is the canvas context value, and a fresh object each
  // render would re-render every box's action buttons.
  const canvasActions = useMemo(
    () => ({ onEdit: setEditing, onDelete: setDeletingNode }),
    [],
  )

  const heading =
    active?.kind === 'TEMPLATE'
      ? t('dashboard.finances.template')
      : formatMonth(active?.year ?? null, active?.month ?? null, locale) ?? ''

  if (templateLoading || sheetsLoading) {
    return (
      <main className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    )
  }

  if (error) {
    return (
      <main className="p-6">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : t('auth.error')}
        </p>
      </main>
    )
  }

  return (
    <main className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-3">
        <div>
          <h1 className="text-lg font-semibold">
            {t('dashboard.finances.title')}
            {heading && <span className="text-muted-foreground"> · {heading}</span>}
          </h1>
          <p className="text-sm text-muted-foreground">
            {active?.kind === 'TEMPLATE'
              ? t('dashboard.finances.templateSubtitle')
              : t('dashboard.finances.subtitle')}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="shrink-0 gap-1.5" disabled={!activeId}>
              <Plus className="size-4" />
              {t('dashboard.finances.addBox')}
              <ChevronDown className="size-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>{t('dashboard.finances.addBox')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setAdding('DESTINATION')}>
              <Wallet className="text-slate-500" />
              {t('dashboard.finances.addDestination')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setAdding('INCOME')}>
              <Banknote className="text-emerald-600" />
              {t('dashboard.finances.addIncome')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setAdding('NOTE')}>
              <StickyNote className="text-yellow-500" />
              {t('dashboard.finances.addNote')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {sheet && sheet.nodes.some((n) => n.kind === 'INCOME') && (
        <div className="px-6 pb-3">
          <SheetSummary sheet={sheet} />
        </div>
      )}

      <div className="mx-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border">
        <div className="min-h-0 flex-1">
          {sheetLoading || !sheet ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <SheetCanvas key={sheet.id} sheet={sheet} actions={canvasActions} />
          )}
        </div>
      </div>

      <div className="mt-3">
        <SheetTabs
          sheets={sheets}
          activeId={activeId}
          onSelect={setActiveId}
          onNewMonth={() => setNewMonthOpen(true)}
          onDelete={setDeletingSheet}
        />
      </div>

      {adding && activeId && (
        <NodeModal
          sheetId={activeId}
          kind={adding}
          nodeCount={sheet?.nodes.length ?? 0}
          onClose={() => setAdding(null)}
        />
      )}
      {editing && activeId && (
        <NodeModal
          key={editing.id}
          sheetId={activeId}
          kind={editing.kind}
          node={sheet?.nodes.find((n) => n.id === editing.id) ?? editing}
          onClose={() => setEditing(null)}
        />
      )}
      {deletingNode && (
        <ConfirmDeleteModal
          title={t('dashboard.finances.deleteBox')}
          message={t('dashboard.finances.deleteBoxDesc')}
          isPending={deleteNode.isPending}
          onConfirm={() => deleteNode.mutateAsync(deletingNode.id)}
          onClose={() => setDeletingNode(null)}
        />
      )}
      {deletingSheet && (
        <ConfirmDeleteModal
          title={t('dashboard.finances.deleteMonth')}
          message={t('dashboard.finances.deleteMonthDesc', {
            month: formatMonth(deletingSheet.year, deletingSheet.month, locale) ?? '',
          })}
          isPending={deleteSheet.isPending}
          onConfirm={() => deleteSheet.mutateAsync(deletingSheet.id)}
          onClose={() => setDeletingSheet(null)}
        />
      )}
      {newMonthOpen && (
        <NewMonthModal
          onCreated={(id) => {
            setActiveId(id)
            toast.success(t('dashboard.finances.monthCreated'))
          }}
          onClose={() => setNewMonthOpen(false)}
        />
      )}
    </main>
  )
}
