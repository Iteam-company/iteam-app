import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import ROLE_SUGGESTIONS from '#/configs/roleSuggestions.json'
import { useTranslation } from 'react-i18next'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { X, Plus, Building2, Users, Mail, CheckCircle2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Badge } from '#/components/ui/badge'
import { useCreateCompany, useBulkCreateRoles, useInviteUsers } from '#/lib/company/mutations'
import { resolveAuth } from '#/lib/auth/guard'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async ({ context }) => {
    const auth = await resolveAuth(context.queryClient)
    if (auth.status !== 'authenticated') throw redirect({ to: '/auth/sign-in' })
  },
  component: OnboardingPage,
  ssr: false,
})


const STEPS = [
  { icon: Building2, key: 'company' },
  { icon: Users, key: 'roles' },
  { icon: Mail, key: 'invite' },
]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => {
        const Icon = s.icon
        const done = i < current
        const active = i === current
        return (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex size-8 items-center justify-center rounded-full border-2 transition-all ${
              done ? 'border-primary bg-primary text-primary-foreground'
              : active ? 'border-primary text-primary'
              : 'border-muted text-muted-foreground'
            }`}>
              {done ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-10 ${i < current ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function OnboardingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [companyId, setCompanyId] = useState<number | null>(null)
  const [roles, setRoles] = useState<string[]>([])
  const [roleInput, setRoleInput] = useState('')
  const [emails, setEmails] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState('')

  const createCompany = useCreateCompany()
  const bulkCreateRoles = useBulkCreateRoles()
  const inviteUsers = useInviteUsers()

  // ── Step 1: Company Info ──────────────────────────────────────────────────

  const companyForm = useFormik({
    initialValues: { title: '', logo: '', description: '' },
    validationSchema: Yup.object({
      title: Yup.string().required(t('validation.required')),
      logo: Yup.string().url(t('onboarding.company.logoUrlError')).optional(),
      description: Yup.string().optional(),
    }),
    onSubmit: async (values, { setStatus }) => {
      try {
        const company = await createCompany.mutateAsync({
          title: values.title,
          logo: values.logo || undefined,
          description: values.description || undefined,
        })
        setCompanyId(company.id)
        setStep(1)
      } catch (err) {
        setStatus(err instanceof Error ? err.message : t('auth.error'))
      }
    },
  })

  // ── Step 2: Roles ─────────────────────────────────────────────────────────

  const addRole = (name: string) => {
    const trimmed = name.trim()
    if (trimmed && !roles.includes(trimmed)) setRoles((r) => [...r, trimmed])
    setRoleInput('')
  }

  const removeRole = (name: string) => setRoles((r) => r.filter((x) => x !== name))

  const submitRoles = async () => {
    if (roles.length > 0) {
      await bulkCreateRoles.mutateAsync({ names: roles })
    }
    setStep(2)
  }

  // ── Step 3: Invite ────────────────────────────────────────────────────────

  const addEmail = (email: string) => {
    const trimmed = email.trim().toLowerCase()
    if (trimmed && !emails.includes(trimmed)) setEmails((e) => [...e, trimmed])
    setEmailInput('')
  }

  const removeEmail = (email: string) => setEmails((e) => e.filter((x) => x !== email))

  const finish = async () => {
    if (emails.length > 0) {
      await inviteUsers.mutateAsync({ emails })
    }
    navigate({ to: '/dashboard' })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-4">
        <span className="text-2xl font-bold tracking-tight">Iteam</span>
        <StepIndicator current={step} />
        <p className="text-sm text-muted-foreground">
          {t('onboarding.progress', { step: step + 1, total: 3 })}
        </p>
      </div>

      {/* ── Step 1 ── */}
      {step === 0 && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('onboarding.company.title')}</CardTitle>
            <CardDescription>{t('onboarding.company.subtitle')}</CardDescription>
          </CardHeader>
          <form onSubmit={companyForm.handleSubmit} noValidate>
            <CardContent className="flex flex-col gap-4">
              {companyForm.status && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {companyForm.status}
                </p>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="title">{t('onboarding.company.name')}</Label>
                <Input id="title" {...companyForm.getFieldProps('title')}
                  aria-invalid={companyForm.touched.title && !!companyForm.errors.title} />
                {companyForm.touched.title && companyForm.errors.title && (
                  <p className="text-sm text-destructive">{companyForm.errors.title}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="logo">
                  {t('onboarding.company.logo')}
                  <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
                </Label>
                <Input id="logo" type="url" placeholder="https://…" {...companyForm.getFieldProps('logo')} />
                {companyForm.touched.logo && companyForm.errors.logo && (
                  <p className="text-sm text-destructive">{companyForm.errors.logo}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">
                  {t('onboarding.company.description')}
                  <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
                </Label>
                <Input id="description" {...companyForm.getFieldProps('description')} />
              </div>
              <Button type="submit" className="mt-2 w-full" disabled={createCompany.isPending}>
                {createCompany.isPending ? t('onboarding.saving') : t('onboarding.next')}
              </Button>
            </CardContent>
          </form>
        </Card>
      )}

      {/* ── Step 2 ── */}
      {step === 1 && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('onboarding.roles.title')}</CardTitle>
            <CardDescription>{t('onboarding.roles.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Input
                placeholder={t('onboarding.roles.placeholder')}
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRole(roleInput) } }}
              />
              <Button type="button" variant="outline" size="icon" onClick={() => addRole(roleInput)}>
                <Plus className="size-4" />
              </Button>
            </div>

            {/* Suggestions */}
            <div>
              <p className="mb-2 text-xs text-muted-foreground">{t('onboarding.roles.suggestions')}</p>
              <div className="flex flex-wrap gap-2">
                {ROLE_SUGGESTIONS.filter((s) => !roles.includes(s)).map((s) => (
                  <Badge key={s} variant="outline" className="cursor-pointer hover:bg-accent"
                    onClick={() => addRole(s)}>
                    <Plus className="mr-1 size-3" />{s}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Added roles */}
            {roles.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium">{t('onboarding.roles.added')}</p>
                <div className="flex flex-wrap gap-2">
                  {roles.map((r) => (
                    <Badge key={r} className="gap-1">
                      {r}
                      <button onClick={() => removeRole(r)} className="ml-1 rounded-full hover:bg-primary-foreground/20">
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setStep(2)}>
                {t('onboarding.skip')}
              </Button>
              <Button className="flex-1" onClick={submitRoles} disabled={bulkCreateRoles.isPending}>
                {bulkCreateRoles.isPending ? t('onboarding.saving') : t('onboarding.next')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3 ── */}
      {step === 2 && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('onboarding.invite.title')}</CardTitle>
            <CardDescription>{t('onboarding.invite.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder={t('onboarding.invite.placeholder')}
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(emailInput) } }}
              />
              <Button type="button" variant="outline" size="icon" onClick={() => addEmail(emailInput)}>
                <Plus className="size-4" />
              </Button>
            </div>

            {emails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {emails.map((e) => (
                  <Badge key={e} variant="secondary" className="gap-1">
                    {e}
                    <button onClick={() => removeEmail(e)}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => navigate({ to: '/dashboard' })}>
                {t('onboarding.skip')}
              </Button>
              <Button className="flex-1" onClick={finish} disabled={inviteUsers.isPending}>
                {inviteUsers.isPending ? t('onboarding.saving') : t('onboarding.finish')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
