import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { StatsCard } from '#/components/schedule/StatsCard'
import { ZoomCalendar } from '#/components/schedule/ZoomCalendar'
import { todayUTC } from '#/components/schedule/date-utils'
import { resolveCompany } from '#/lib/company/guard'
import { useMonthData } from '#/lib/workdays/mutations'

export const Route = createFileRoute('/dashboard/schedule')({
  beforeLoad: async ({ context }) => {
    const company = await resolveCompany(context.queryClient)
    if (!company) throw redirect({ to: '/dashboard/company' })
  },
  component: SchedulePage,
  ssr: false,
})

function SchedulePage() {
  // Anchor lives here so the stats card tracks the month being viewed.
  const [anchor, setAnchor] = useState(todayUTC)
  const { data: monthData } = useMonthData(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1)

  return (
    <main className="flex h-[calc(100vh-56px)] flex-col gap-4 p-6">
      <StatsCard daysOff={monthData?.stats.daysOff} />
      <ZoomCalendar anchor={anchor} setAnchor={setAnchor} />
    </main>
  )
}
