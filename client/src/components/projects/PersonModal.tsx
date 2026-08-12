import { useTranslation } from 'react-i18next'
import { Loader2, X } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '#/components/ui/dialog'
import { useRemoveProjectMember } from '#/lib/projects/mutations'
import type { Project } from '#/lib/projects/types'

/**
 * The reverse view of a project: everything one person is on, with a way to
 * detach them. Reached by clicking a holder or helper node.
 */
export function PersonModal({
  userId,
  projects,
  onClose,
}: {
  userId: number
  projects: Project[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  const removeMember = useRemoveProjectMember()

  const rows = projects
    .map((project) => ({
      project,
      member: project.members.find((m) => m.userId === userId),
    }))
    .filter((row) => row.member)

  const person = rows[0]?.member?.user

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{person?.fullName ?? t('dashboard.projects.person')}</DialogTitle>
          <DialogDescription>
            {person?.occupation || t('dashboard.projects.personDesc')}
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t('dashboard.projects.personNoProjects')}
          </p>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {rows.map(({ project, member }) => (
              <div key={project.id} className="flex items-center gap-2 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm">{project.name}</span>
                <Badge variant={member!.role === 'HOLDER' ? 'default' : 'secondary'}>
                  {member!.role === 'HOLDER'
                    ? t('dashboard.projects.holder')
                    : t('dashboard.projects.helper')}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title={t('dashboard.projects.removePerson')}
                  disabled={removeMember.isPending}
                  onClick={() => removeMember.mutate({ projectId: project.id, userId })}
                >
                  {removeMember.isPending
                    ? <Loader2 className="size-3.5 animate-spin" />
                    : <X className="size-3.5" />}
                </Button>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('dashboard.projects.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
