import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
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
import { useResetPassword } from '#/lib/auth/mutations'
import { resolveAuth } from '#/lib/auth/guard'

export const Route = createFileRoute('/auth/reset-password')({
  beforeLoad: async ({ context }) => {
    const auth = await resolveAuth(context.queryClient)
    if (auth.status === 'authenticated') throw redirect({ to: '/dashboard' })
  },
  component: ResetPasswordPage,
  ssr: false,
})

function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const resetPassword = useResetPassword()

  const validationSchema = Yup.object({
    token: Yup.string().required(t('validation.required')),
    password: Yup.string()
      .min(8, t('validation.minLength', { min: 8 }))
      .required(t('validation.required')),
    repeatPassword: Yup.string()
      .oneOf([Yup.ref('password')], t('validation.passwordMatch'))
      .required(t('validation.required')),
  })

  const formik = useFormik({
    initialValues: { token: '', password: '', repeatPassword: '' },
    validationSchema,
    onSubmit: async (values, { setStatus }) => {
      try {
        await resetPassword.mutateAsync(values)
        navigate({ to: '/auth/sign-in' })
      } catch (err) {
        setStatus(err instanceof Error ? err.message : t('auth.error'))
      }
    },
  })

  const field = (name: keyof typeof formik.values) => ({
    ...formik.getFieldProps(name),
    'aria-invalid': formik.touched[name] && !!formik.errors[name],
  })

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('auth.resetPassword.title')}</CardTitle>
          <CardDescription>{t('auth.resetPassword.subtitle')}</CardDescription>
        </CardHeader>

        <form onSubmit={formik.handleSubmit} noValidate>
          <CardContent className="flex flex-col gap-4">
            {formik.status && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formik.status}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="token">{t('auth.resetPassword.token')}</Label>
              <Input id="token" type="text" {...field('token')} />
              {formik.touched.token && formik.errors.token && (
                <p className="text-sm text-destructive">{formik.errors.token}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{t('auth.resetPassword.password')}</Label>
              <Input id="password" type="password" autoComplete="new-password" {...field('password')} />
              {formik.touched.password && formik.errors.password && (
                <p className="text-sm text-destructive">{formik.errors.password}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="repeatPassword">{t('auth.resetPassword.repeatPassword')}</Label>
              <Input id="repeatPassword" type="password" autoComplete="new-password" {...field('repeatPassword')} />
              {formik.touched.repeatPassword && formik.errors.repeatPassword && (
                <p className="text-sm text-destructive">{formik.errors.repeatPassword}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="mt-5 flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              disabled={formik.isSubmitting || resetPassword.isPending}
            >
              {resetPassword.isPending
                ? t('auth.resetPassword.submitting')
                : t('auth.resetPassword.submit')}
            </Button>

            <Link
              to="/auth/sign-in"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {t('auth.resetPassword.backToSignIn')}
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
