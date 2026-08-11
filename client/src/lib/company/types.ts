// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginatedMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
}

export interface Paginated<T> {
  data: T[]
  meta: PaginatedMeta
}

export interface MembersQuery {
  page?: number
  limit?: number
  search?: string
  companyRoleId?: number
  occupation?: string
}

// ── Company ───────────────────────────────────────────────────────────────────

export interface CompanySettings {
  id?: number
  companyId: number
  smtpHost: string | null
  smtpPort: number | null
  smtpUser: string | null
  smtpPassword: string | null
  smtpFromEmail: string | null
}

export interface Company {
  id: number
  title: string
  logo: string | null
  description: string | null
  roles: CompanyRole[]
  settings: CompanySettings | null
  createdAt: string
  updatedAt: string
}

// Kept in sync with the CompanyPermission enum in server/prisma/schema.prisma.
// ADMIN is a blanket grant; the rest are granular and assignable per role.
// No guard enforces these yet — schema/CRUD only for now.
export type CompanyPermission =
  | 'ADMIN'
  | 'MANAGE_COMPANY'
  | 'MANAGE_SETTINGS'
  | 'MANAGE_ROLES'
  | 'MANAGE_MEMBERS'
  | 'MANAGE_SALARY'
  | 'INVITE_MEMBERS'
  | 'SEND_MESSAGES'

export interface CompanyRole {
  id: number
  name: string
  companyId: number
  permissions: CompanyPermission[]
  createdAt: string
}

export interface CompanyRoleRef {
  id: number
  name: string
  permissions: CompanyPermission[]
}

export interface CompanyMember {
  id: number
  email: string
  fullName: string
  phone: string | null
  occupation: string | null
  salary?: number | null
  companyRoleId: number | null
  companyRole: CompanyRoleRef | null
  createdAt: string
}

export interface CreateCompanyRequest {
  title: string
  logo?: string
  description?: string
}

export interface UpdateCompanySettingsRequest {
  smtpHost?: string
  smtpPort?: number
  smtpUser?: string
  smtpPassword?: string
  smtpFromEmail?: string
}

export interface InviteUsersRequest {
  emails: string[]
}

export interface BulkCreateRolesRequest {
  names: string[]
}

export interface CreateRoleRequest {
  name: string
  permissions?: CompanyPermission[]
}

export interface UpdateRolePermissionsRequest {
  permissions: CompanyPermission[]
}

export interface InviteResponse {
  queued: number
  sent: number
  failed: number
  emails: string[]
  message: string
}

export interface SendMessageRequest {
  subject: string
  body: string
  userIds: number[]
}

export interface SendMessageResponse {
  sent: number
  failed: number
  total: number
  errors?: string[]
}
