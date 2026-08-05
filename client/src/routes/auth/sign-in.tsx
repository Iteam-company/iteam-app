import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
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
import { useSignIn } from '#/lib/auth/mutations'

export const Route = createFileRoute('/auth/sign-in')({
  component: SignInPage,
  ssr: false,
})

function SignInPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const signIn = useSignIn()

  const validationSchema = Yup.object({
    email: Yup.string()
      .email(t('validation.email'))
      .required(t('validation.required')),
    password: Yup.string().required(t('validation.required')),
  })

  const formik = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema,
    onSubmit: async (values, { setStatus }) => {
      try {
        await signIn.mutateAsync(values)
        navigate({ to: '/dashboard' })
      } catch (err) {
        setStatus(err instanceof Error ? err.message : t('auth.error'))
      }
    },
  })

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('auth.signIn.title')}</CardTitle>
          <CardDescription>{t('auth.signIn.subtitle')}</CardDescription>
        </CardHeader>

        <form onSubmit={formik.handleSubmit} noValidate>
          <CardContent className="flex flex-col gap-4">
            {formik.status && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formik.status}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t('auth.signIn.email')}</Label>
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

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('auth.signIn.password')}</Label>
                <Link
                  to="/auth/forgot-password"
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  {t('auth.signIn.forgotPassword')}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...formik.getFieldProps('password')}
                aria-invalid={formik.touched.password && !!formik.errors.password}
              />
              {formik.touched.password && formik.errors.password && (
                <p className="text-sm text-destructive">{formik.errors.password}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="mt-5 flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              disabled={formik.isSubmitting || signIn.isPending}
            >
              {signIn.isPending ? t('auth.signIn.submitting') : t('auth.signIn.submit')}
            </Button>

            <p className="text-sm text-muted-foreground">
              {t('auth.signIn.noAccount')}{' '}
              <Link
                to="/auth/sign-up"
                className="text-foreground underline-offset-4 hover:underline"
              >
                {t('auth.signIn.signUp')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
