import { api } from '#/lib/api'
import type {
  AuthResponse,
  ForgotPasswordRequest,
  MeResponse,
  MessageResponse,
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

  forgotPassword: (body: ForgotPasswordRequest) =>
    api.post<MessageResponse>('/auth/forgot-password', body),

  resetPassword: (body: ResetPasswordRequest) =>
    api.post<MessageResponse>('/auth/reset-password', body),

  me: () => api.get<MeResponse>('/auth/me'),
  updateMe: (body: UpdateProfileRequest) =>
    api.patch<MeResponse>('/auth/me', body),
}

// ── Token helpers ─────────────────────────────────────────────────────────────

export function saveToken(token: string) {
  localStorage.setItem('accessToken', token)
}

export function clearToken() {
  localStorage.removeItem('accessToken')
}

export function getToken() {
  return localStorage.getItem('accessToken')
}
