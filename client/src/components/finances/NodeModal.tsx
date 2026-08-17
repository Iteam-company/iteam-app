import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '#/components/ui/select'
import { useProjects } from '#/lib/projects/mutations'
import { useCreateNode, useUpdateNode } from '#/lib/finances/mutations'
import {
  CURRENCIES, DESTINATION_TYPES, INCOME_STATUSES,
} from '#/lib/finances/types'
import type {
  FinanceDestinationType, FinanceIncomeStatus, FinanceNode, FinanceNodeKind,
} from '#/lib/finances/types'
import { DESTINATION_LABEL_KEY, nextSpot } from './presentation'

/** Create when `node` is absent, edit otherwise. `kind` is fixed either way. */
export function NodeModal({
  sheetId,
  kind,
  node,
  nodeCount = 0,
  onClose,
}: {
  sheetId: number
  kind: FinanceNodeKind
  node?: FinanceNode
  /** Drives where a newly created box lands so boxes never stack. */
  nodeCount?: number
  onClose: () => void
}) {
  const { t } = useTranslation()
  const createNode = useCreateNode()
  const updateNode = useUpdateNode()
  const { data: projects = [] } = useProjects()

  const [destinationType, setDestinationType] = useState<FinanceDestinationType>(
    node?.destinationType ?? 'PAYPAL',
  )
  const [label, setLabel] = useState(node?.label ?? '')
  const [projectId, setProjectId] = useState<string>(
    node?.projectId != null ? String(node.projectId) : '',
  )
  const [amount, setAmount] = useState(node?.amount != null ? String(node.amount) : '')
  const [currency, setCurrency] = useState(node?.currency ?? 'USD')
  const [dateFrom, setDateFrom] = useState(node?.dateFrom?.slice(0, 10) ?? '')
  const [dateTo, setDateTo] = useState(node?.dateTo?.slice(0, 10) ?? '')
  const [status, setStatus] = useState<FinanceIncomeStatus>(
    node?.status ?? 'NOT_TRANSFERRED',
  )
  const [text, setText] = useState(node?.text ?? '')
  const [error, setError] = useState<string | null>(null)

  const isPending = createNode.isPending || updateNode.isPending

  const buildBody = () => {
    if (kind === 'DESTINATION') {
      return { destinationType, label: label.trim() }
    }
    if (kind === 'INCOME') {
      return {
        projectId: projectId ? Number(projectId) : undefined,
        amount: amount.trim() === '' ? null : Number(amount),
        currency,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        status,
      }
    }
    return { text }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (kind === 'DESTINATION' && destinationType === 'OTHER' && !label.trim()) {
      setError(t('dashboard.finances.customNameRequired'))
      return
    }
    if (kind === 'INCOME' && !projectId && !node?.projectId) {
      setError(t('dashboard.finances.projectRequired'))
      return
    }
    if (kind === 'INCOME' && amount.trim() !== '' && !(Number(amount) >= 0)) {
      setError(t('dashboard.finances.amountInvalid'))
      return
    }
    if (kind === 'INCOME' && dateFrom && dateTo && dateTo < dateFrom) {
      setError(t('dashboard.finances.dateRangeInvalid'))
      return
    }

    try {
      const body = buildBody()
      if (node) await updateNode.mutateAsync({ id: node.id, ...body })
      else await createNode.mutateAsync({ sheetId, kind, ...nextSpot(nodeCount), ...body })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.error'))
    }
  }

  const title = node
    ? t(`dashboard.finances.edit${titleSuffix(kind)}`)
    : t(`dashboard.finances.add${titleSuffix(kind)}`)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t('dashboard.finances.modalDesc')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          {kind === 'DESTINATION' && (
            <>
              <Field label={t('dashboard.finances.accountType')}>
                <Select
                  value={destinationType}
                  onValueChange={(v) => setDestinationType(v as FinanceDestinationType)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DESTINATION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`dashboard.finances.destination.${DESTINATION_LABEL_KEY[type]}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {destinationType === 'OTHER' && (
                <Field label={t('dashboard.finances.customName')}>
                  <Input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Wise EUR"
                    autoFocus
                  />
                </Field>
              )}
            </>
          )}

          {kind === 'INCOME' && (
            <>
              <Field label={t('dashboard.finances.project')}>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('dashboard.finances.projectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={String(project.id)}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-[1fr_110px] gap-3">
                <Field label={t('dashboard.finances.amount')}>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="3000"
                  />
                </Field>
                <Field label={t('dashboard.finances.currency')}>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((code) => (
                        <SelectItem key={code} value={code}>{code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label={t('dashboard.finances.dateFrom')}>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </Field>
                <Field label={t('dashboard.finances.dateTo')}>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </Field>
              </div>
              <p className="-mt-2 text-xs text-muted-foreground">
                {t('dashboard.finances.dateHint')}
              </p>

              <Field label={t('dashboard.finances.statusLabel')}>
                <Select value={status} onValueChange={(v) => setStatus(v as FinanceIncomeStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INCOME_STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(`dashboard.finances.status.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}

          {kind === 'NOTE' && (
            <Field label={t('dashboard.finances.noteText')}>
              <textarea
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
                className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </Field>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('dashboard.finances.cancel')}
            </Button>
            <Button type="submit" className="gap-2" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {node ? t('dashboard.finances.save') : t('dashboard.finances.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function titleSuffix(kind: FinanceNodeKind) {
  return kind === 'DESTINATION' ? 'Destination' : kind === 'INCOME' ? 'Income' : 'Note'
}
