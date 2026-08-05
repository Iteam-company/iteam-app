import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { companyApi } from './api'
import type {
  BulkCreateRolesRequest,
  CreateCompanyRequest,
  InviteUsersRequest,
  UpdateCompanySettingsRequest,
} from './types'

export const COMPANY_KEY = ['company', 'me'] as const
export const SETTINGS_KEY = ['company', 'settings'] as const

export function useMyCompany() {
  return useQuery({
    queryKey: COMPANY_KEY,
    queryFn: () => companyApi.getMe(),
    retry: false,
  })
}

export function useCreateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateCompanyRequest) => companyApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMPANY_KEY }),
  })
}

export function useBulkCreateRoles() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: BulkCreateRolesRequest) => companyApi.bulkCreateRoles(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMPANY_KEY }),
  })
}

export function useInviteUsers() {
  return useMutation({
    mutationFn: (body: InviteUsersRequest) => companyApi.invite(body),
  })
}

export const ROLES_KEY = ['company', 'roles'] as const

export function useCompanyRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => companyApi.getRoles(),
    retry: false,
  })
}

export const MEMBERS_KEY = ['company', 'members'] as const

export function useCompanyMembers(query: import('./types').MembersQuery = {}) {
  return useQuery({
    queryKey: [...MEMBERS_KEY, query] as const,
    queryFn: () => companyApi.getMembers(query),
    retry: false,
    placeholderData: (prev) => prev,
  })
}

export function useUpdateMemberOccupation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, occupation }: { id: number; occupation: string }) =>
      companyApi.updateMemberOccupation(id, occupation),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEMBERS_KEY }),
  })
}

export function useUpdateMemberSalary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, salary }: { id: number; salary: number | null }) =>
      companyApi.updateMemberSalary(id, salary),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEMBERS_KEY }),
  })
}

export function useUpdateMemberRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: 'USER' | 'ADMIN' }) =>
      companyApi.updateMemberRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEMBERS_KEY }),
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => companyApi.removeMember(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: MEMBERS_KEY }),
  })
}

export function useUpdateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<import('./types').CreateCompanyRequest>) =>
      companyApi.update(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMPANY_KEY }),
  })
}

export function useCompanySettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => companyApi.getSettings(),
    retry: false,
  })
}

export function useUpdateCompanySettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateCompanySettingsRequest) => companyApi.updateSettings(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }),
  })
}

export function useSendMessage() {
  return useMutation({
    mutationFn: (body: import('./types').SendMessageRequest) => companyApi.sendMessage(body),
  })
}
