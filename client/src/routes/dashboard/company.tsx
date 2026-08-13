import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Building2, Loader2, Lock, Save } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { useMe } from '#/lib/auth/mutations'
import {
  useMyCompany,
  useUpdateCompany,
  useCompanySettings,
  useUpdateCompanySettings,
} from '#/lib/company/mutations'

export const Route = createFileRoute('/dashboard/company')({ component: CompanyPage, ssr: false })

function CompanyPage() {
  const { data: me, isLoading: meLoading } = useMe()
  const { data: company, isLoading: companyLoading } = useMyCompany()
  const isAdmin = me?.companyRole?.permissions.includes('ADMIN') ?? false

  if (meLoading || companyLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!company) {
    return <NoCompanyView />
  }

  if (!isAdmin) {
    return <AdminOnlyView />
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      <InfoCard />
      <SmtpCard />
    </main>
  )
}

// ── No company yet ───────────────────────────────────────────────────────────

function NoCompanyView() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-12 text-center">
      <Building2 className="size-10 text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium">{t('dashboard.company.noneTitle')}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{t('dashboard.company.noneDesc')}</p>
      </div>
      <div className="flex gap-3">
        <Button onClick={() => navigate({ to: '/onboarding' })}>
          {t('dashboard.company.create')}
        </Button>
        <Button variant="outline" disabled title={t('dashboard.company.joinComingSoon')}>
          {t('dashboard.company.join')}
        </Button>
      </div>
    </div>
  )
}

// ── Not an admin of an existing company ──────────────────────────────────────

function AdminOnlyView() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
      <Lock className="size-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{t('dashboard.settings.adminOnly')}</p>
    </div>
  )
}

// ── Info Card ─────────────────────────────────────────────────────────────────

function InfoCard() {
  const { t } = useTranslation()
  const { data: company, isLoading } = useMyCompany()
  const updateCompany = useUpdateCompany()

  const form = useFormik({
    enableReinitialize: true,
    initialValues: {
      title: company?.title ?? '',
      logo: company?.logo ?? '',
      description: company?.description ?? '',
    },
    validationSchema: Yup.object({
      title: Yup.string().required(t('validation.required')),
      logo: Yup.string().url(t('onboarding.company.logoUrlError')).nullable(),
    }),
    onSubmit: async (values, { setStatus }) => {
      try {
        await updateCompany.mutateAsync({
          title: values.title,
          logo: values.logo || undefined,
          description: values.description || undefined,
        })
        setStatus({ success: true })
      } catch (err) {
        setStatus({ error: err instanceof Error ? err.message : t('auth.error') })
      }
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('dashboard.settings.companyInfo')}</CardTitle>
      </CardHeader>
      {isLoading ? (
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      ) : (
        <form onSubmit={form.handleSubmit} noValidate>
          <CardContent className="flex flex-col gap-6">
            {(form.status?.success || form.status?.error) && (
              <>
                {form.status.success && (
                  <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
                    {t('dashboard.settings.saved')}
                  </p>
                )}
                {form.status.error && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {form.status.error}
                  </p>
                )}
              </>
            )}

            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="title">{t('dashboard.settings.companyName')}</Label>
                <Input id="title" {...form.getFieldProps('title')}
                  aria-invalid={form.touched.title && !!form.errors.title} />
                {form.touched.title && form.errors.title && (
                  <p className="text-xs text-destructive">{form.errors.title}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="logo">{t('dashboard.settings.logoUrl')}</Label>
                <Input id="logo" placeholder="https://..." {...form.getFieldProps('logo')}
                  aria-invalid={form.touched.logo && !!form.errors.logo} />
                {form.touched.logo && form.errors.logo && (
                  <p className="text-xs text-destructive">{form.errors.logo}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 lg:col-span-2 xl:col-span-3">
                <Label htmlFor="description">{t('dashboard.settings.companyDesc')}</Label>
                <Textarea id="description" rows={3} {...form.getFieldProps('description')} />
              </div>
            </div>
          </CardContent>

          <CardFooter className="border-t border-border pt-4 border-t-0">
            <Button type="submit" className="gap-2" disabled={updateCompany.isPending}>
              {updateCompany.isPending
                ? <><Loader2 className="size-4 animate-spin" />{t('dashboard.settings.saving')}</>
                : <><Save className="size-4" />{t('dashboard.settings.save')}</>}
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  )
}

// ── SMTP Card ─────────────────────────────────────────────────────────────────

function SmtpCard() {
  const { t } = useTranslation()
  const { data: settings, isLoading } = useCompanySettings()
  const updateSettings = useUpdateCompanySettings()

  const form = useFormik({
    enableReinitialize: true,
    initialValues: {
      smtpHost: settings?.smtpHost ?? '',
      smtpPort: settings?.smtpPort ?? '',
      smtpUser: settings?.smtpUser ?? '',
      smtpPassword: settings?.smtpPassword ?? '',
      smtpFromEmail: settings?.smtpFromEmail ?? '',
    },
    onSubmit: async (values, { setStatus }) => {
      try {
        await updateSettings.mutateAsync({
          smtpHost: values.smtpHost || undefined,
          smtpPort: values.smtpPort ? Number(values.smtpPort) : undefined,
          smtpUser: values.smtpUser || undefined,
          smtpPassword: values.smtpPassword || undefined,
          smtpFromEmail: values.smtpFromEmail || undefined,
        })
        setStatus({ success: true })
      } catch (err) {
        setStatus({ error: err instanceof Error ? err.message : t('auth.error') })
      }
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('dashboard.settings.smtp')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('dashboard.settings.smtpDesc')}</p>
      </CardHeader>
      {isLoading ? (
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      ) : (
        <form onSubmit={form.handleSubmit} noValidate>
          <CardContent className="flex flex-col gap-6">
            {(form.status?.success || form.status?.error) && (
              <>
                {form.status.success && (
                  <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
                    {t('dashboard.settings.saved')}
                  </p>
                )}
                {form.status.error && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {form.status.error}
                  </p>
                )}
              </>
            )}

            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="smtpHost">{t('dashboard.settings.smtpHost')}</Label>
                <Input id="smtpHost" placeholder="smtp.gmail.com" {...form.getFieldProps('smtpHost')} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="smtpPort">{t('dashboard.settings.smtpPort')}</Label>
                <Input id="smtpPort" type="number" placeholder="587" {...form.getFieldProps('smtpPort')} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="smtpUser">{t('dashboard.settings.smtpUser')}</Label>
                <Input id="smtpUser" placeholder="you@example.com" {...form.getFieldProps('smtpUser')} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="smtpPassword">{t('dashboard.settings.smtpPassword')}</Label>
                <Input id="smtpPassword" type="password" {...form.getFieldProps('smtpPassword')} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="smtpFromEmail">{t('dashboard.settings.smtpFrom')}</Label>
                <Input id="smtpFromEmail" placeholder="noreply@company.com" {...form.getFieldProps('smtpFromEmail')} />
              </div>
            </div>
          </CardContent>

          <CardFooter className="border-t border-border pt-4 border-t-0">
            <Button type="submit" className="gap-2" disabled={updateSettings.isPending}>
              {updateSettings.isPending
                ? <><Loader2 className="size-4 animate-spin" />{t('dashboard.settings.saving')}</>
                : <><Save className="size-4" />{t('dashboard.settings.save')}</>}
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  )
}
