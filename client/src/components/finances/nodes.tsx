import { createContext, useContext } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Node, NodeProps } from '@xyflow/react'
import { useTranslation } from 'react-i18next'
import { Banknote, CreditCard, Landmark, Pencil, Trash2, Wallet } from 'lucide-react'
import type { FinanceDestinationType, FinanceNode } from '#/lib/finances/types'
import {
  DESTINATION_LABEL_KEY,
  STATUS_DOT,
  STATUS_STYLE,
  formatAmount,
  formatDateRange,
} from './presentation'

// ── Actions ───────────────────────────────────────────────────────────────────

export interface SheetActions {
  onEdit: (node: FinanceNode) => void
  onDelete: (node: FinanceNode) => void
}

export const SheetActionsContext = createContext<SheetActions | null>(null)

function useSheetActions() {
  const actions = useContext(SheetActionsContext)
  if (!actions) throw new Error('SheetActionsContext is missing')
  return actions
}

// ── Node data ─────────────────────────────────────────────────────────────────

export type DestinationData = {
  node: FinanceNode
  /** Sum of every income box wired into this destination. */
  total: number
  /** The part of `total` whose income boxes are already TRANSFERRED. */
  received: number
  currency: string | null
}
export type IncomeData = { node: FinanceNode }
export type NoteData = { node: FinanceNode }

const DESTINATION_ICON: Record<FinanceDestinationType, typeof Wallet> = {
  PAYPAL: Wallet,
  PAYONEER: CreditCard,
  BANK_FOP: Landmark,
  OTHER: Banknote,
}

// ── Shared chrome ─────────────────────────────────────────────────────────────

const HANDLE = 'size-2.5! border-0! bg-white/70!'

function NodeActions({ node }: { node: FinanceNode }) {
  const { t } = useTranslation()
  const { onEdit, onDelete } = useSheetActions()

  return (
    <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      <button
        type="button"
        title={t('dashboard.finances.edit')}
        aria-label={t('dashboard.finances.edit')}
        onClick={(e) => { e.stopPropagation(); onEdit(node) }}
        className="flex size-5 items-center justify-center rounded-md bg-black/15 transition-colors hover:bg-black/30"
      >
        <Pencil className="size-3" />
      </button>
      <button
        type="button"
        title={t('dashboard.finances.delete')}
        aria-label={t('dashboard.finances.delete')}
        onClick={(e) => { e.stopPropagation(); onDelete(node) }}
        className="flex size-5 items-center justify-center rounded-md bg-black/15 transition-colors hover:bg-black/30"
      >
        <Trash2 className="size-3" />
      </button>
    </div>
  )
}

// ── Destination ───────────────────────────────────────────────────────────────

function DestinationNode({ data }: NodeProps<Node<DestinationData, 'destination'>>) {
  const { t } = useTranslation()
  const { node, total, received, currency } = data
  const type = node.destinationType ?? 'OTHER'
  const Icon = DESTINATION_ICON[type]
  const name =
    type === 'OTHER'
      ? node.label || t('dashboard.finances.destination.other')
      : t(`dashboard.finances.destination.${DESTINATION_LABEL_KEY[type]}`)

  return (
    <div className="group w-[210px] rounded-xl bg-slate-800 px-3 py-2.5 text-white shadow-md ring-1 ring-slate-500/40 dark:bg-slate-700">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-slate-300" />
          <p className="truncate text-sm font-semibold">{name}</p>
        </div>
        <NodeActions node={node} />
      </div>

      {total > 0 && (
        <p className="mt-1 text-[11px] text-slate-300">
          <span className="font-medium text-emerald-400">
            {formatAmount(received, currency)}
          </span>
          {' / '}
          {formatAmount(total, currency)}
        </p>
      )}

      {/* Money flows upward: income sits below and connects into this. */}
      <Handle type="target" position={Position.Bottom} className={HANDLE} />
    </div>
  )
}

// ── Income source ─────────────────────────────────────────────────────────────

function IncomeNode({ data }: NodeProps<Node<IncomeData, 'income'>>) {
  const { t, i18n } = useTranslation()
  const { node } = data
  const locale = i18n.language === 'uk' ? 'uk-UA' : 'en-US'
  const status = node.status ?? 'NOT_TRANSFERRED'
  const holder = node.project?.members[0]?.user.fullName
  const dates = formatDateRange(node.dateFrom, node.dateTo, locale)

  return (
    <div
      className={`group w-[210px] rounded-xl px-3 py-2.5 text-white shadow-md ring-1 ${STATUS_STYLE[status]}`}
    >
      {/* Drag from here up into a destination. */}
      <Handle type="source" position={Position.Top} className={HANDLE} />

      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">
          {node.project?.name || node.label || t('dashboard.finances.untitled')}
        </p>
        <NodeActions node={node} />
      </div>

      <p className="mt-0.5 text-base font-semibold tabular-nums">
        {node.amount == null
          ? '—'
          : formatAmount(Number(node.amount), node.currency)}
      </p>

      <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-white/85">
        {holder && <span className="truncate">{holder}</span>}
        {dates && <span>{dates}</span>}
        <span className="mt-0.5 inline-flex items-center gap-1">
          <span className={`size-1.5 rounded-full ${STATUS_DOT[status]} ring-1 ring-white/60`} />
          {t(`dashboard.finances.status.${status}`)}
        </span>
      </div>
    </div>
  )
}

// ── Note ──────────────────────────────────────────────────────────────────────

function NoteNode({ data }: NodeProps<Node<NoteData, 'note'>>) {
  const { t } = useTranslation()
  const { node } = data

  return (
    <div className="group w-[210px] rounded-xl bg-yellow-200 px-3 py-2.5 text-yellow-950 shadow-md ring-1 ring-yellow-400/60 dark:bg-yellow-300">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-xs">
          {node.text || t('dashboard.finances.emptyNote')}
        </p>
        <NodeActions node={node} />
      </div>
    </div>
  )
}

// Module scope: a new object each render remounts every node in React Flow.
export const nodeTypes = {
  destination: DestinationNode,
  income: IncomeNode,
  note: NoteNode,
}
