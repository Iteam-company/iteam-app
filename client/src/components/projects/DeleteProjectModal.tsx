import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '#/components/ui/dialog'
import { useDeleteProject } from '#/lib/projects/mutations'
import type { Project } from '#/lib/projects/types'

export function DeleteProjectModal({
  project,
  onClose,
}: {
  project: Project
  onClose: () => void
}) {
  const { t } = useTranslation()
  const deleteProject = useDeleteProject()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setError(null)
    try {
      await deleteProject.mutateAsync(project.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.error'))
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('dashboard.projects.deleteTitle')}</DialogTitle>
          <DialogDescription>
            {t('dashboard.projects.deleteMessage', { name: project.name })}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('dashboard.projects.cancel')}
          </Button>
          <Button variant="destructive" className="gap-2" onClick={handleDelete} disabled={deleteProject.isPending}>
            {deleteProject.isPending && <Loader2 className="size-4 animate-spin" />}
            {t('dashboard.projects.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
