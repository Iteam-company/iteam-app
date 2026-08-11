import type { CompanyRoleRef } from '#/lib/company/types'

// ── Requests ──────────────────────────────────────────────────────────────────

export interface SignUpRequest {
  email: string
  password: string
  repeatPassword: string
  fullName: string
  phone?: string
  dob?: string
  occupation?: string
}

export interface SignInRequest {
  email: string
  password: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  password: string
  repeatPassword: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

// ── Responses ─────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number
  email: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface RefreshResponse {
  accessToken: string
  refreshToken: string
}

export interface MessageResponse {
  message: string
  resetToken?: string // returned in dev only
}

export interface UpdateProfileRequest {
  fullName?: string
  phone?: string
  occupation?: string
}

export interface MeResponse {
  id: number
  email: string
  fullName: string
  phone: string | null
  occupation: string | null
  companyId: number | null
  companyRole: CompanyRoleRef | null
  statusNote: string | null
  salary?: number | null
}
