// ── Project ───────────────────────────────────────────────────────────────────

/** HOLDER owns the project, HELPER assists on it. */
export type ProjectRole = 'HOLDER' | 'HELPER'

export interface ProjectMemberUser {
  id: number
  fullName: string
  occupation: string | null
}

export interface ProjectMember {
  projectId: number
  userId: number
  role: ProjectRole
  addedAt: string
  user: ProjectMemberUser
}

export interface Project {
  id: number
  name: string
  country: string | null
  /** null = fixed price */
  hours: number | null
  companyId: number
  members: ProjectMember[]
  createdAt: string
  updatedAt: string
}

// ── Requests ──────────────────────────────────────────────────────────────────

export interface CreateProjectRequest {
  name: string
  country?: string | null
  hours?: number | null
  holderIds?: number[]
  helperIds?: number[]
}

export interface UpdateProjectRequest {
  name?: string
  country?: string | null
  hours?: number | null
}

export interface AddProjectMembersRequest {
  userIds: number[]
  role: ProjectRole
}
