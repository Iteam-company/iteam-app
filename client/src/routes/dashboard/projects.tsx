import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { List, Loader2, Network, Plus } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { AddPeopleModal } from '#/components/projects/AddPeopleModal'
import { DeleteProjectModal } from '#/components/projects/DeleteProjectModal'
import { PersonModal } from '#/components/projects/PersonModal'
import { ProjectModal } from '#/components/projects/ProjectModal'
import { ProjectsGraph } from '#/components/projects/ProjectsGraph'
import { ProjectsList } from '#/components/projects/ProjectsList'
import { useProjects, useRemoveProjectMember } from '#/lib/projects/mutations'
import type { Project, ProjectRole } from '#/lib/projects/types'

export const Route = createFileRoute('/dashboard/projects')({
  component: ProjectsPage,
  ssr: false,
})

function ProjectsPage() {
  const { t } = useTranslation()
  const { data: projects = [], isLoading, error } = useProjects()
  const removeMember = useRemoveProjectMember()

  // Modal state. Every one of these is open to any company member — projects
  // are deliberately not admin-gated.
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState<Project | null>(null)
  const [addingTo, setAddingTo] = useState<{ project: Project; role: ProjectRole } | null>(null)
  const [personId, setPersonId] = useState<number | null>(null)

  const graphActions = {
    onEditProject: setEditing,
    onDeleteProject: setDeleting,
    onAddPeople: (project: Project, role: ProjectRole) => setAddingTo({ project, role }),
    onRemovePerson: (projectId: number, userId: number) =>
      removeMember.mutate({ projectId, userId }),
    onOpenPerson: setPersonId,
  }

  return (
    <main className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">{t('dashboard.projects.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('dashboard.projects.subtitle')}</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          {t('dashboard.projects.newProject')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : t('auth.error')}
        </p>
      ) : (
        <Tabs defaultValue="graph" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mb-3 w-fit">
            <TabsTrigger value="graph" className="gap-1.5">
              <Network className="size-3.5" />
              {t('dashboard.projects.graphTab')}
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5">
              <List className="size-3.5" />
              {t('dashboard.projects.listTab')}
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="graph"
            className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border"
          >
            <ProjectsGraph projects={projects} actions={graphActions} />
          </TabsContent>

          <TabsContent value="list" className="min-h-0 flex-1 overflow-y-auto">
            <ProjectsList
              projects={projects}
              onEdit={setEditing}
              onDelete={setDeleting}
              onAddPeople={(project, role) => setAddingTo({ project, role })}
            />
          </TabsContent>
        </Tabs>
      )}

      {creating && <ProjectModal onClose={() => setCreating(false)} />}
      {editing && (
        <ProjectModal
          key={editing.id}
          project={projects.find((p) => p.id === editing.id) ?? editing}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <DeleteProjectModal project={deleting} onClose={() => setDeleting(null)} />
      )}
      {addingTo && (
        <AddPeopleModal
          project={projects.find((p) => p.id === addingTo.project.id) ?? addingTo.project}
          role={addingTo.role}
          onClose={() => setAddingTo(null)}
        />
      )}
      {personId != null && (
        <PersonModal
          userId={personId}
          projects={projects}
          onClose={() => setPersonId(null)}
        />
      )}
    </main>
  )
}
