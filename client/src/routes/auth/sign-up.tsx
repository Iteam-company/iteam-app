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
import { useSignUp } from '#/lib/auth/mutations'
import { resolveAuth } from '#/lib/auth/guard'

export const Route = createFileRoute('/auth/sign-up')({
  beforeLoad: async ({ context }) => {
    const auth = await resolveAuth(context.queryClient)
    if (auth.status === 'authenticated') throw redirect({ to: '/dashboard' })
  },
  component: SignUpPage,
  ssr: false,
})

function SignUpPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const signUp = useSignUp()

  const validationSchema = Yup.object({
    email: Yup.string()
      .email(t('validation.email'))
      .required(t('validation.required')),
    password: Yup.string()
      .min(8, t('validation.minLength', { min: 8 }))
      .required(t('validation.required')),
    repeatPassword: Yup.string()
      .oneOf([Yup.ref('password')], t('validation.passwordMatch'))
      .required(t('validation.required')),
    fullName: Yup.string().required(t('validation.required')),
    phone: Yup.string(),
    dob: Yup.string(),
    occupation: Yup.string(),
  })

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
      repeatPassword: '',
      fullName: '',
      phone: '',
      dob: '',
    },
    validationSchema,
    onSubmit: async (values, { setStatus }) => {
      try {
        await signUp.mutateAsync(values)
        navigate({ to: '/' })
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
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{t('auth.signUp.title')}</CardTitle>
          <CardDescription>{t('auth.signUp.subtitle')}</CardDescription>
        </CardHeader>

        <form onSubmit={formik.handleSubmit} noValidate>
          <CardContent className="flex flex-col gap-4">
            {formik.status && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formik.status}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">{t('auth.signUp.fullName')}</Label>
              <Input id="fullName" type="text" autoComplete="name" {...field('fullName')} />
              {formik.touched.fullName && formik.errors.fullName && (
                <p className="text-sm text-destructive">{formik.errors.fullName}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t('auth.signUp.email')}</Label>
              <Input id="email" type="email" autoComplete="email" {...field('email')} />
              {formik.touched.email && formik.errors.email && (
                <p className="text-sm text-destructive">{formik.errors.email}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">
                {t('auth.signUp.phone')}
                <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Input id="phone" type="tel" autoComplete="tel" {...field('phone')} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dob">
                {t('auth.signUp.dob')}
                <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Input id="dob" type="date" {...field('dob')} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{t('auth.signUp.password')}</Label>
              <Input id="password" type="password" autoComplete="new-password" {...field('password')} />
              {formik.touched.password && formik.errors.password && (
                <p className="text-sm text-destructive">{formik.errors.password}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="repeatPassword">{t('auth.signUp.repeatPassword')}</Label>
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
              disabled={formik.isSubmitting || signUp.isPending}
            >
              {signUp.isPending ? t('auth.signUp.submitting') : t('auth.signUp.submit')}
            </Button>

            <p className="text-sm text-muted-foreground">
              {t('auth.signUp.haveAccount')}{' '}
              <Link
                to="/auth/sign-in"
                className="text-foreground underline-offset-4 hover:underline"
              >
                {t('auth.signUp.signIn')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
