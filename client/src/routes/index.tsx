import { createFileRoute, redirect } from '@tanstack/react-router'
import { resolveAuth } from '#/lib/auth/guard'

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const auth = await resolveAuth(context.queryClient)
    throw redirect({ to: auth.status === 'authenticated' ? '/dashboard' : '/auth/sign-in' })
  },
  ssr: false,
})
