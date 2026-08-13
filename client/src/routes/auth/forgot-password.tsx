import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useFormik } from 'formik'
import { useTranslation } from 'react-i18next'
import * as Yup from 'yup'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { useForgotPassword } from '#/lib/auth/mutations'
import { resolveAuth } from '#/lib/auth/guard'

export const Route = createFileRoute('/auth/forgot-password')({
  beforeLoad: async ({ context }) => {
    const auth = await resolveAuth(context.queryClient)
    if (auth.status === 'authenticated') throw redirect({ to: '/dashboard' })
  },
  component: ForgotPasswordPage,
  ssr: false,
})

function ForgotPasswordPage() {
  const { t } = useTranslation()
  const forgotPassword = useForgotPassword()

  const validationSchema = Yup.object({
    email: Yup.string()
      .email(t('validation.email'))
      .required(t('validation.required')),
  })

  const formik = useFormik({
    initialValues: { email: '' },
    validationSchema,
    onSubmit: async (values, { setStatus }) => {
      try {
        await forgotPassword.mutateAsync(values)
      } catch (err) {
        setStatus(err instanceof Error ? err.message : t('auth.error'))
      }
    },
  })

  if (forgotPassword.isSuccess) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>{t('auth.forgotPassword.successTitle')}</CardTitle>
            <CardDescription>
              {t('auth.forgotPassword.successMessage')}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link
              to="/auth/sign-in"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {t('auth.forgotPassword.backToSignIn')}
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('auth.forgotPassword.title')}</CardTitle>
          <CardDescription>{t('auth.forgotPassword.subtitle')}</CardDescription>
        </CardHeader>

        <form onSubmit={formik.handleSubmit} noValidate>
          <CardContent className="flex flex-col gap-4">
            {formik.status && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formik.status}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t('auth.forgotPassword.email')}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...formik.getFieldProps('email')}
                aria-invalid={formik.touched.email && !!formik.errors.email}
              />
              {formik.touched.email && formik.errors.email && (
                <p className="text-sm text-destructive">{formik.errors.email}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="mt-5 flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              disabled={formik.isSubmitting || forgotPassword.isPending}
            >
              {forgotPassword.isPending
                ? t('auth.forgotPassword.submitting')
                : t('auth.forgotPassword.submit')}
            </Button>

            <Link
              to="/auth/sign-in"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {t('auth.forgotPassword.backToSignIn')}
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
