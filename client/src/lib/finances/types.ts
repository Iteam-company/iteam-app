// ── Enums (mirrored from server/prisma/schema.prisma) ─────────────────────────

export type FinanceSheetKind = 'TEMPLATE' | 'MONTH'
export type FinanceNodeKind = 'DESTINATION' | 'INCOME' | 'NOTE'
export type FinanceDestinationType = 'PAYPAL' | 'PAYONEER' | 'BANK_FOP' | 'OTHER'
export type FinanceIncomeStatus = 'NOT_TRANSFERRED' | 'PENDING' | 'TRANSFERRED'

export const DESTINATION_TYPES: FinanceDestinationType[] = [
  'PAYPAL',
  'PAYONEER',
  'BANK_FOP',
  'OTHER',
]

export const INCOME_STATUSES: FinanceIncomeStatus[] = [
  'NOT_TRANSFERRED',
  'PENDING',
  'TRANSFERRED',
]

/** Enough currencies for PayPal / Payoneer / a Ukrainian FOP account. */
export const CURRENCIES = ['USD', 'EUR', 'UAH', 'PLN', 'GBP'] as const

// ── Entities ──────────────────────────────────────────────────────────────────

export interface FinanceNodeProject {
  id: number
  name: string
  /** Only HOLDER members are included by the API. */
  members: { user: { id: number; fullName: string } }[]
}

export interface FinanceNode {
  id: number
  sheetId: number
  kind: FinanceNodeKind
  x: number
  y: number

  // DESTINATION
  destinationType: FinanceDestinationType | null
  /** Custom destination name, or a snapshot of the project name for income. */
  label: string | null

  // INCOME
  projectId: number | null
  project: FinanceNodeProject | null
  /** Prisma Decimal — serialised as a string, parse before doing maths. */
  amount: string | null
  currency: string | null
  dateFrom: string | null
  /** Null means dateFrom is an exact date rather than a range start. */
  dateTo: string | null
  status: FinanceIncomeStatus | null

  // NOTE
  text: string | null
}

export interface FinanceEdge {
  id: number
  sheetId: number
  sourceId: number
  targetId: number
}

export interface FinanceSheetSummary {
  id: number
  kind: FinanceSheetKind
  year: number | null
  month: number | null
}

export interface FinanceSheet extends FinanceSheetSummary {
  nodes: FinanceNode[]
  edges: FinanceEdge[]
}

// ── Requests ──────────────────────────────────────────────────────────────────

export interface CreateSheetRequest {
  year: number
  month: number
  fromTemplate?: boolean
}

export interface CreateNodeRequest {
  kind: FinanceNodeKind
  x?: number
  y?: number
  destinationType?: FinanceDestinationType
  label?: string
  projectId?: number
  amount?: number | null
  currency?: string
  dateFrom?: string | null
  dateTo?: string | null
  status?: FinanceIncomeStatus
  text?: string
}

export type UpdateNodeRequest = Omit<CreateNodeRequest, 'kind'>

export interface CreateEdgeRequest {
  sourceId: number
  targetId: number
}
