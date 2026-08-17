import { createFileRoute, redirect } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { useCompanyMembers } from '#/lib/company/mutations'
import { resolveCompany } from '#/lib/company/guard'

export const Route = createFileRoute('/dashboard/')({
  beforeLoad: async ({ context }) => {
    const company = await resolveCompany(context.queryClient)
    if (!company) throw redirect({ to: '/dashboard/company' })
  },
  component: CommandCenter,
  ssr: false,
})

function CommandCenter() {
  const { t } = useTranslation()
  const { data } = useCompanyMembers({ limit: 100 })
  const members = data?.data ?? []

  return (
    <main className="flex flex-col gap-6 p-6">
      {/* Stats */}
      <Card className="sm:w-64">
        <CardHeader className="pb-2">
          <CardDescription>{t('dashboard.command.totalWorkers')}</CardDescription>
          <CardTitle className="text-3xl">{data?.meta.total ?? members.length}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{t('dashboard.command.activeTeam')}</p>
        </CardContent>
      </Card>

      {/* Team vitality grid */}
      <div>
        <h2 className="mb-3 text-sm font-semibold">{t('dashboard.command.teamGrid')}</h2>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('dashboard.command.noMembers')}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => (
              <Card key={m.id} className="flex items-center gap-3 p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                  {m.fullName[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium leading-none">{m.fullName}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{m.occupation ?? '—'}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
