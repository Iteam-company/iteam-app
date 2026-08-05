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
  role?: 'USER' | 'ADMIN'
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

export interface CompanyRole {
  id: number
  name: string
  companyId: number
  createdAt: string
}

export interface CompanyMember {
  id: number
  email: string
  fullName: string
  phone: string | null
  occupation: string | null
  salary?: number | null
  role: 'USER' | 'ADMIN'
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
