import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from './api'
import type {
  AddProjectMembersRequest,
  CreateProjectRequest,
  UpdateProjectRequest,
} from './types'

export const PROJECTS_KEY = ['projects'] as const

// ── Queries ───────────────────────────────────────────────────────────────────

/** Every project at once — the graph needs the whole hierarchy in one payload. */
export function useProjects() {
  return useQuery({
    queryKey: PROJECTS_KEY,
    queryFn: () => projectsApi.list(),
    retry: false,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateProjectRequest) => projectsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECTS_KEY }),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateProjectRequest & { id: number }) =>
      projectsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECTS_KEY }),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => projectsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECTS_KEY }),
  })
}

export function useAddProjectMembers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, ...body }: AddProjectMembersRequest & { projectId: number }) =>
      projectsApi.addMembers(projectId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECTS_KEY }),
  })
}

export function useRemoveProjectMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, userId }: { projectId: number; userId: number }) =>
      projectsApi.removeMember(projectId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECTS_KEY }),
  })
}
