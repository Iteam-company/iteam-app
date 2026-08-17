export const FINANCE_NODE_KINDS = ['DESTINATION', 'INCOME', 'NOTE'] as const;
export type FinanceNodeKind = (typeof FINANCE_NODE_KINDS)[number];

export const FINANCE_DESTINATION_TYPES = [
  'PAYPAL',
  'PAYONEER',
  'BANK_FOP',
  'OTHER',
] as const;
export type FinanceDestinationType = (typeof FINANCE_DESTINATION_TYPES)[number];

export const FINANCE_INCOME_STATUSES = [
  'NOT_TRANSFERRED',
  'PENDING',
  'TRANSFERRED',
] as const;
export type FinanceIncomeStatus = (typeof FINANCE_INCOME_STATUSES)[number];
