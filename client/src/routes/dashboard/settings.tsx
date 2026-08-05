import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Camera, Loader2, Save, ShieldCheck, User } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '#/components/ui/select'
import { useMe, useUpdateMe } from '#/lib/auth/mutations'
import { useCompanyRoles } from '#/lib/company/mutations'

export const Route = createFileRoute('/dashboard/settings')({ component: SettingsPage, ssr: false })

function SettingsPage() {
  const { t } = useTranslation()
  const { data: me, isLoading } = useMe()
  const updateMe = useUpdateMe()
  const { data: roles } = useCompanyRoles()

  const avatarKey = me ? `avatar_${me.id}` : null
  const [avatarSrc, setAvatarSrc] = useState<string | null>(
    () => (avatarKey ? localStorage.getItem(avatarKey) : null),
  )
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !avatarKey) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result as string
      localStorage.setItem(avatarKey, url)
      setAvatarSrc(url)
    }
    reader.readAsDataURL(file)
  }

  const form = useFormik({
    enableReinitialize: true,
    initialValues: {
      fullName: me?.fullName ?? '',
      phone: me?.phone ?? '',
      occupation: me?.occupation ?? '',
    },
    validationSchema: Yup.object({
      fullName: Yup.string().required(t('validation.required')),
    }),
    onSubmit: async (values, { setStatus }) => {
      try {
        await updateMe.mutateAsync(values)
        setStatus({ success: true })
      } catch (err) {
        setStatus({ error: err instanceof Error ? err.message : t('auth.error') })
      }
    },
  })

  if (isLoading || !me) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <main className="flex flex-col gap-4 p-6">
      {/* Hero card */}
      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative flex size-18 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground text-2xl font-bold ring-2 ring-border hover:ring-primary transition-all"
          >
            {avatarSrc
              ? <img src={avatarSrc} alt="avatar" className="size-full object-cover" />
              : <span>{me.fullName[0]?.toUpperCase()}</span>}
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="size-5 text-white" />
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold leading-tight">{me.fullName}</h2>
            <p className="text-sm text-muted-foreground">{me.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={me.role === 'ADMIN' ? 'default' : 'secondary'} className="text-xs">
                {me.role === 'ADMIN'
                  ? <><ShieldCheck className="mr-1 size-3" />Admin</>
                  : <><User className="mr-1 size-3" />User</>}
              </Badge>
              {me.occupation && <span className="text-xs text-muted-foreground">{me.occupation}</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit form card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('dashboard.settings.profile')}
          </CardTitle>
        </CardHeader>
        <form onSubmit={form.handleSubmit} noValidate>
          <CardContent className="flex flex-col gap-5 pt-0">
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

            <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fullName">{t('dashboard.settings.name')}</Label>
                <Input id="fullName" {...form.getFieldProps('fullName')}
                  aria-invalid={form.touched.fullName && !!form.errors.fullName} />
                {form.touched.fullName && form.errors.fullName && (
                  <p className="text-xs text-destructive">{form.errors.fullName}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">{t('dashboard.settings.phone')}</Label>
                <Input id="phone" type="tel" placeholder="+380" {...form.getFieldProps('phone')} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="occupation">{t('dashboard.settings.occupation')}</Label>
                <Select
                  value={form.values.occupation || '__none__'}
                  onValueChange={(val) =>
                    form.setFieldValue('occupation', val === '__none__' ? '' : val)
                  }
                >
                  <SelectTrigger id="occupation">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {/* current value not in roles list — keep it visible */}
                    {form.values.occupation &&
                      !roles?.some((r) => r.name === form.values.occupation) && (
                        <SelectItem value={form.values.occupation}>
                          {form.values.occupation}
                        </SelectItem>
                      )}
                    {roles?.map((r) => (
                      <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>{t('dashboard.settings.email')}</Label>
                <Input value={me.email} disabled className="opacity-50" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>{t('dashboard.settings.role')}</Label>
                <div className="flex h-9 items-center">
                  <Badge variant={me.role === 'ADMIN' ? 'default' : 'secondary'}>
                    {me.role === 'ADMIN'
                      ? <><ShieldCheck className="mr-1 size-3" />Admin</>
                      : <><User className="mr-1 size-3" />User</>}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <Button type="submit" size="sm" className="gap-2" disabled={updateMe.isPending}>
                {updateMe.isPending
                  ? <><Loader2 className="size-4 animate-spin" />{t('dashboard.settings.saving')}</>
                  : <><Save className="size-4" />{t('dashboard.settings.save')}</>}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>

      {/* Weekly schedule defaults */}
      {me && <WeeklyScheduleCard userId={me.id} />}
    </main>
  )
}

// ── WeeklyScheduleCard ────────────────────────────────────────────────────────

type WorkDayStatus = 'WORKING' | 'WEEKEND' | 'SICK_LEAVE' | 'VACATION'

const DEFAULT_SCHEDULE: Record<number, WorkDayStatus> = {
  0: 'WORKING', 1: 'WORKING', 2: 'WORKING', 3: 'WORKING', 4: 'WORKING',
  5: 'WEEKEND', 6: 'WEEKEND',
}

function getDayName(idx: number, locale: string) {
  // April 13, 2026 is a Monday — use as reference
  return new Date(Date.UTC(2026, 3, 13 + idx)).toLocaleDateString(locale, { weekday: 'long' })
}

function WeeklyScheduleCard({ userId }: { userId: number }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'uk' ? 'uk-UA' : 'en-US'
  const storageKey = `weeklySchedule_${userId}`

  const [schedule, setSchedule] = useState<Record<number, WorkDayStatus>>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? 'null') ?? DEFAULT_SCHEDULE
    } catch { return DEFAULT_SCHEDULE }
  })

  const update = (idx: number, status: WorkDayStatus) => {
    const next = { ...schedule, [idx]: status }
    setSchedule(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
  }

  const statusOptions: { value: WorkDayStatus; label: string }[] = [
    { value: 'WORKING',    label: t('me.statusWorking') },
    { value: 'WEEKEND',    label: t('me.statusWeekend') },
    { value: 'SICK_LEAVE', label: t('me.statusSickLeave') },
    { value: 'VACATION',   label: t('me.statusVacation') },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t('dashboard.settings.weeklySchedule')}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t('dashboard.settings.weeklyScheduleDesc')}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="text-sm capitalize w-28 shrink-0">
              {getDayName(i, locale)}
            </span>
            <Select
              value={schedule[i] ?? DEFAULT_SCHEDULE[i]}
              onValueChange={(v) => update(i, v as WorkDayStatus)}
            >
              <SelectTrigger className="h-8 text-sm flex-1 max-w-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
