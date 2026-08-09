import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Mail, Plus, Zap } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { MailComposer } from '#/components/automation/MailComposer'
import { StatsRow } from '#/components/automation/StatsRow'
import { TemplateCard } from '#/components/automation/TemplateCard'
import { WorkflowRow } from '#/components/automation/WorkflowRow'
import { TEMPLATES, WORKFLOWS  } from '#/components/automation/mock-data'
import type {WorkflowStatus} from '#/components/automation/mock-data';

export const Route = createFileRoute('/dashboard/automation')({ component: AutomationPage, ssr: false })

function AutomationPage() {
  const { t } = useTranslation()
  const [workflows, setWorkflows] = useState(WORKFLOWS)

  const toggleWorkflow = (id: number) => {
    setWorkflows((prev) =>
      prev.map((w) =>
        w.id === id
          ? { ...w, status: (w.status === 'active' ? 'paused' : 'active') as WorkflowStatus }
          : w,
      ),
    )
  }

  const active = workflows.filter((w) => w.status === 'active').length
  const totalSent = 1248

  return (
    <main className="flex flex-col gap-6 p-6">
      <StatsRow active={active} total={workflows.length} totalSent={totalSent} />

      <Tabs defaultValue="send-email">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="send-email">
              <Mail className="mr-1.5 size-3.5" />
              {t('dashboard.automation.sendEmail')}
            </TabsTrigger>
            <TabsTrigger value="workflows">
              <Zap className="mr-1.5 size-3.5" />
              {t('dashboard.automation.workflows')}
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileText className="mr-1.5 size-3.5" />
              {t('dashboard.automation.templates')}
            </TabsTrigger>
          </TabsList>
          <Button size="sm" className="gap-1.5">
            <Plus className="size-3.5" />
            {t('dashboard.automation.newWorkflow')}
          </Button>
        </div>

        {/* Send email tab */}
        <TabsContent value="send-email" className="mt-4">
          <MailComposer />
        </TabsContent>

        {/* Workflows tab */}
        <TabsContent value="workflows" className="mt-4 flex flex-col gap-3">
          {workflows.map((wf) => (
            <WorkflowRow key={wf.id} wf={wf} onToggle={toggleWorkflow} />
          ))}
        </TabsContent>

        {/* Templates tab */}
        <TabsContent value="templates" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.map((tpl) => (
              <TemplateCard key={tpl.id} tpl={tpl} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </main>
  )
}
