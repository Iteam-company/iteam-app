import { api } from '#/lib/api'
import type {
  AuthResponse,
  ForgotPasswordRequest,
  MeResponse,
  MessageResponse,
  RefreshResponse,
  RefreshTokenRequest,
  ResetPasswordRequest,
  SignInRequest,
  SignUpRequest,
  UpdateProfileRequest,
} from './types'

export const authApi = {
  signUp: (body: SignUpRequest) =>
    api.post<AuthResponse>('/auth/sign-up', body),

  signIn: (body: SignInRequest) =>
    api.post<AuthResponse>('/auth/sign-in', body),

  refresh: (body: RefreshTokenRequest) =>
    api.post<RefreshResponse>('/auth/refresh', body),

  signOut: (body: RefreshTokenRequest) =>
    api.post<MessageResponse>('/auth/sign-out', body),

  forgotPassword: (body: ForgotPasswordRequest) =>
    api.post<MessageResponse>('/auth/forgot-password', body),

  resetPassword: (body: ResetPasswordRequest) =>
    api.post<MessageResponse>('/auth/reset-password', body),

  me: () => api.get<MeResponse>('/auth/me'),
  updateMe: (body: UpdateProfileRequest) =>
    api.patch<MeResponse>('/auth/me', body),
}

// ── Token helpers ─────────────────────────────────────────────────────────────

export function saveTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
}

export function clearTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

export function getToken() {
  return localStorage.getItem('accessToken')
}

export function getRefreshToken() {
  return localStorage.getItem('refreshToken')
}
