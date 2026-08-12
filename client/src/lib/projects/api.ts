import { api } from '#/lib/api'
import type {
  AddProjectMembersRequest,
  CreateProjectRequest,
  Project,
  UpdateProjectRequest,
} from './types'

export const projectsApi = {
  list: () => api.get<Project[]>('/projects'),
  get: (id: number) => api.get<Project>(`/projects/${id}`),
  create: (body: CreateProjectRequest) => api.post<Project>('/projects', body),
  update: (id: number, body: UpdateProjectRequest) =>
    api.patch<Project>(`/projects/${id}`, body),
  remove: (id: number) => api.delete<{ deleted: boolean }>(`/projects/${id}`),

  addMembers: (id: number, body: AddProjectMembersRequest) =>
    api.post<Project>(`/projects/${id}/members`, body),
  removeMember: (id: number, userId: number) =>
    api.delete<Project>(`/projects/${id}/members/${userId}`),
}
