import { api } from '#/lib/api'
import type {
  BulkCreateRolesRequest,
  Company,
  CompanyMember,
  CompanyRole,
  CompanySettings,
  CreateCompanyRequest,
  InviteResponse,
  InviteUsersRequest,
  MembersQuery,
  Paginated,
  SendMessageRequest,
  SendMessageResponse,
  UpdateCompanySettingsRequest,
} from './types'

export const companyApi = {
  getMe: () => api.get<Company | null>('/company/me'),
  create: (body: CreateCompanyRequest) => api.post<Company>('/company', body),
  update: (body: Partial<CreateCompanyRequest>) => api.patch<Company>('/company', body),

  getSettings: () => api.get<CompanySettings>('/company/settings'),
  updateSettings: (body: UpdateCompanySettingsRequest) =>
    api.patch<CompanySettings>('/company/settings', body),

  getMembers: (q: MembersQuery = {}) => {
    const params = new URLSearchParams()
    if (q.page) params.set('page', String(q.page))
    if (q.limit) params.set('limit', String(q.limit))
    if (q.search) params.set('search', q.search)
    if (q.role) params.set('role', q.role)
    if (q.occupation) params.set('occupation', q.occupation)
    const qs = params.toString()
    return api.get<Paginated<CompanyMember>>(`/company/members${qs ? `?${qs}` : ''}`)
  },
  updateMemberRole: (id: number, role: 'USER' | 'ADMIN') =>
    api.patch<Pick<CompanyMember, 'id' | 'email' | 'fullName' | 'role'>>(`/company/members/${id}/role`, { role }),
  updateMemberOccupation: (id: number, occupation: string) =>
    api.patch<Pick<CompanyMember, 'id' | 'email' | 'fullName' | 'occupation'>>(`/company/members/${id}/occupation`, { occupation }),
  updateMemberSalary: (id: number, salary: number | null) =>
    api.patch<{ id: number; salary: number | null }>(`/company/members/${id}/salary`, { salary }),
  removeMember: (id: number) =>
    api.delete<{ removed: boolean }>(`/company/members/${id}`),

  getRoles: () => api.get<CompanyRole[]>('/company/roles'),
  bulkCreateRoles: (body: BulkCreateRolesRequest) =>
    api.post<CompanyRole[]>('/company/roles/bulk', body),
  deleteRole: (id: number) => api.delete<{ deleted: boolean }>(`/company/roles/${id}`),

  invite: (body: InviteUsersRequest) => api.post<InviteResponse>('/company/invite', body),

  sendMessage: (body: SendMessageRequest) =>
    api.post<SendMessageResponse>('/company/send-message', body),
}
