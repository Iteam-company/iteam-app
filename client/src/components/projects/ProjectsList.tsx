import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Search, Trash2, UserPlus, X } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { useRemoveProjectMember } from '#/lib/projects/mutations'
import type { Project, ProjectRole } from '#/lib/projects/types'

const COLS = 'grid-cols-[minmax(0,1.4fr)_120px_110px_minmax(0,2fr)_80px]'

export function ProjectsList({
  projects,
  onEdit,
  onDelete,
  onAddPeople,
}: {
  projects: Project[]
  onEdit: (project: Project) => void
  onDelete: (project: Project) => void
  onAddPeople: (project: Project, role: ProjectRole) => void
}) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')

  // Debounced so typing doesn't re-filter on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setSearch(input.trim().toLowerCase()), 300)
    return () => clearTimeout(id)
  }, [input])

  const filtered = useMemo(() => {
    if (!search) return projects
    return projects.filter((project) =>
      [project.name, project.country ?? '', ...project.members.map((m) => m.user.fullName)]
        .join(' ')
        .toLowerCase()
        .includes(search),
    )
  }, [projects, search])

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('dashboard.projects.searchPlaceholder')}
          className="pl-8"
        />
      </div>

      <div className="rounded-lg border border-border">
        <div className={`grid ${COLS} gap-3 border-b border-border px-4 py-2.5 text-xs font-medium text-muted-foreground`}>
          <span>{t('dashboard.projects.name')}</span>
          <span>{t('dashboard.projects.country')}</span>
          <span>{t('dashboard.projects.hours')}</span>
          <span>{t('dashboard.projects.people')}</span>
          <span className="text-right">{t('dashboard.projects.actions')}</span>
        </div>

        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {t('dashboard.projects.noProjects')}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddPeople={onAddPeople}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────

function ProjectRow({
  project,
  onEdit,
  onDelete,
  onAddPeople,
}: {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (project: Project) => void
  onAddPeople: (project: Project, role: ProjectRole) => void
}) {
  const { t } = useTranslation()
  const removeMember = useRemoveProjectMember()

  const holders = project.members.filter((m) => m.role === 'HOLDER')
  const helpers = project.members.filter((m) => m.role === 'HELPER')

  return (
    <div className={`grid ${COLS} items-center gap-3 px-4 py-3`}>
      <span className="truncate text-sm font-medium">{project.name}</span>
      <span className="truncate text-sm text-muted-foreground">{project.country || '—'}</span>
      <span className="text-sm text-muted-foreground">
        {project.hours != null
          ? `${project.hours} ${t('dashboard.projects.hoursShort')}`
          : t('dashboard.projects.fixedPrice')}
      </span>

      <div className="flex flex-wrap items-center gap-1">
        {[...holders, ...helpers].map((member) => (
          <Badge
            key={member.userId}
            variant={member.role === 'HOLDER' ? 'default' : 'secondary'}
            className="gap-1 pr-1"
          >
            {member.user.fullName}
            <button
              type="button"
              title={t('dashboard.projects.removePerson')}
              disabled={removeMember.isPending}
              onClick={() =>
                removeMember.mutate({ projectId: project.id, userId: member.userId })
              }
              className="rounded-full p-0.5 transition-colors hover:bg-black/20"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <Button
          variant="ghost"
          size="icon-xs"
          title={t('dashboard.projects.addHelper')}
          onClick={() => onAddPeople(project, 'HELPER')}
        >
          <UserPlus className="size-3.5" />
        </Button>
      </div>

      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          title={t('dashboard.projects.edit')}
          onClick={() => onEdit(project)}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title={t('dashboard.projects.delete')}
          onClick={() => onDelete(project)}
        >
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  )
}
