import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '#/components/ui/dialog'
import { useAddProjectMembers } from '#/lib/projects/mutations'
import type { Project, ProjectRole } from '#/lib/projects/types'
import { MemberPicker } from './MemberPicker'

/** Quick "attach people to this project" flow, opened from a graph node. */
export function AddPeopleModal({
  project,
  role,
  onClose,
}: {
  project: Project
  role: ProjectRole
  onClose: () => void
}) {
  const { t } = useTranslation()
  const addMembers = useAddProjectMembers()
  const [selected, setSelected] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)

  // Already on the project in the *other* role — adding them here would silently
  // move them, so block it and let the user do it explicitly from the editor.
  const takenByOtherRole = project.members
    .filter((m) => m.role !== role)
    .map((m) => m.userId)

  const alreadyInRole = project.members
    .filter((m) => m.role === role)
    .map((m) => m.userId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await addMembers.mutateAsync({ projectId: project.id, userIds: selected, role })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.error'))
    }
  }

  const title =
    role === 'HOLDER'
      ? t('dashboard.projects.addHolder')
      : t('dashboard.projects.addHelper')

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{project.name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <MemberPicker
            label={title}
            selected={[...alreadyInRole, ...selected]}
            disabledIds={[...takenByOtherRole, ...alreadyInRole]}
            onToggle={(userId) =>
              setSelected((prev) =>
                prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
              )
            }
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('dashboard.projects.cancel')}
            </Button>
            <Button type="submit" className="gap-2" disabled={addMembers.isPending || !selected.length}>
              {addMembers.isPending && <Loader2 className="size-4 animate-spin" />}
              {t('dashboard.projects.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
