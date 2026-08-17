import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '#/components/ui/select'
import { useCreateSheet } from '#/lib/finances/mutations'

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export function NewMonthModal({
  onCreated,
  onClose,
}: {
  onCreated: (sheetId: number) => void
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const createSheet = useCreateSheet()
  const locale = i18n.language === 'uk' ? 'uk-UA' : 'en-US'

  // Default to next month — the common case is planning the month ahead.
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

  const [year, setYear] = useState(String(next.getUTCFullYear()))
  const [month, setMonth] = useState(String(next.getUTCMonth() + 1))
  const [fromTemplate, setFromTemplate] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const years = [next.getUTCFullYear() - 1, next.getUTCFullYear(), next.getUTCFullYear() + 1]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const sheet = await createSheet.mutateAsync({
        year: Number(year),
        month: Number(month),
        fromTemplate,
      })
      onCreated(sheet.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.error'))
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dashboard.finances.newMonth')}</DialogTitle>
          <DialogDescription>{t('dashboard.finances.newMonthDesc')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t('dashboard.finances.month')}</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {new Date(Date.UTC(2000, m - 1, 1)).toLocaleDateString(locale, {
                        month: 'long', timeZone: 'UTC',
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('dashboard.finances.year')}</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-start gap-2 rounded-md border border-border p-3 text-sm">
            <input
              type="checkbox"
              checked={fromTemplate}
              onChange={(e) => setFromTemplate(e.target.checked)}
              className="mt-0.5 size-4 rounded border-input"
            />
            <span>
              {t('dashboard.finances.useTemplate')}
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {t('dashboard.finances.useTemplateHint')}
              </span>
            </span>
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('dashboard.finances.cancel')}
            </Button>
            <Button type="submit" className="gap-2" disabled={createSheet.isPending}>
              {createSheet.isPending && <Loader2 className="size-4 animate-spin" />}
              {t('dashboard.finances.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
