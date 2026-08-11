import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi, clearTokens, getRefreshToken, saveTokens } from './api'
import type {
  ForgotPasswordRequest,
  ResetPasswordRequest,
  SignInRequest,
  SignUpRequest,
  UpdateProfileRequest,
} from './types'

export const ME_KEY = ['auth', 'me'] as const

export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: () => authApi.me(),
    retry: false,
    enabled: !!localStorage.getItem('accessToken'),
  })
}

export function useUpdateMe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateProfileRequest) => authApi.updateMe(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ME_KEY }),
  })
}

export function useSignUp() {
  return useMutation({
    mutationFn: (body: SignUpRequest) => authApi.signUp(body),
    onSuccess: (data) => saveTokens(data.accessToken, data.refreshToken),
  })
}

export function useSignIn() {
  return useMutation({
    mutationFn: (body: SignInRequest) => authApi.signIn(body),
    onSuccess: (data) => saveTokens(data.accessToken, data.refreshToken),
  })
}

/** Best-effort server-side revoke, then always clear local tokens. */
export function useSignOut() {
  return useMutation({
    mutationFn: () => {
      const refreshToken = getRefreshToken()
      return refreshToken
        ? authApi.signOut({ refreshToken })
        : Promise.resolve({ message: 'Signed out' })
    },
    onSettled: () => clearTokens(),
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (body: ForgotPasswordRequest) => authApi.forgotPassword(body),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (body: ResetPasswordRequest) => authApi.resetPassword(body),
  })
}
