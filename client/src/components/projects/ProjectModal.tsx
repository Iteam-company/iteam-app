import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  useAddProjectMembers, useCreateProject, useRemoveProjectMember, useUpdateProject,
} from '#/lib/projects/mutations'
import type { Project } from '#/lib/projects/types'
import { MemberPicker } from './MemberPicker'

/** Create when `project` is undefined, edit otherwise. */
export function ProjectModal({
  project,
  onClose,
}: {
  project?: Project
  onClose: () => void
}) {
  const { t } = useTranslation()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const addMembers = useAddProjectMembers()
  const removeMember = useRemoveProjectMember()

  const isEdit = Boolean(project)
  const [name, setName] = useState(project?.name ?? '')
  const [country, setCountry] = useState(project?.country ?? '')
  const [fixedPrice, setFixedPrice] = useState(project ? project.hours == null : false)
  const [hours, setHours] = useState(project?.hours != null ? String(project.hours) : '')
  const [holders, setHolders] = useState<number[]>(
    () => project?.members.filter((m) => m.role === 'HOLDER').map((m) => m.userId) ?? [],
  )
  const [helpers, setHelpers] = useState<number[]>(
    () => project?.members.filter((m) => m.role === 'HELPER').map((m) => m.userId) ?? [],
  )
  const [error, setError] = useState<string | null>(null)

  const isPending =
    createProject.isPending || updateProject.isPending ||
    addMembers.isPending || removeMember.isPending

  const toggle = (list: number[], setList: (v: number[]) => void) => (userId: number) =>
    setList(list.includes(userId) ? list.filter((id) => id !== userId) : [...list, userId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const parsedHours = fixedPrice || !hours.trim() ? null : Number(hours)
    if (parsedHours != null && (!Number.isFinite(parsedHours) || parsedHours < 0)) {
      setError(t('dashboard.projects.hoursInvalid'))
      return
    }

    try {
      if (!project) {
        const created = await createProject.mutateAsync({
          name: name.trim(),
          country: country.trim() || null,
          hours: parsedHours,
          holderIds: holders,
          helperIds: helpers,
        })
        const people = holders.length + helpers.filter((id) => !holders.includes(id)).length
        toast.success(t('dashboard.projects.createdToast', { name: created.name }), {
          description: people
            ? t('dashboard.projects.createdToastPeople', { count: people })
            : undefined,
        })
      } else {
        await updateProject.mutateAsync({
          id: project.id,
          name: name.trim(),
          country: country.trim() || null,
          hours: parsedHours,
        })
        await syncMembers(project)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.error'))
    }
  }

  /** Applies only the membership delta, so untouched people keep their addedAt. */
  const syncMembers = async (current: Project) => {
    const before = new Map(current.members.map((m) => [m.userId, m.role]))
    const after = new Map<number, 'HOLDER' | 'HELPER'>([
      ...holders.map((id) => [id, 'HOLDER'] as const),
      ...helpers.filter((id) => !holders.includes(id)).map((id) => [id, 'HELPER'] as const),
    ])

    const removed = [...before.keys()].filter((id) => !after.has(id))
    for (const userId of removed) {
      await removeMember.mutateAsync({ projectId: current.id, userId })
    }

    for (const role of ['HOLDER', 'HELPER'] as const) {
      const changed = [...after.entries()]
        .filter(([id, r]) => r === role && before.get(id) !== r)
        .map(([id]) => id)
      if (changed.length) {
        await addMembers.mutateAsync({ projectId: current.id, userIds: changed, role })
      }
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('dashboard.projects.editProject') : t('dashboard.projects.newProject')}
          </DialogTitle>
          <DialogDescription>{t('dashboard.projects.modalDesc')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-name">{t('dashboard.projects.name')}</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('dashboard.projects.namePlaceholder')}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-country">{t('dashboard.projects.country')}</Label>
              <Input
                id="project-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder={t('dashboard.projects.countryPlaceholder')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-hours">{t('dashboard.projects.hours')}</Label>
              <Input
                id="project-hours"
                type="number"
                min={0}
                value={hours}
                disabled={fixedPrice}
                onChange={(e) => setHours(e.target.value)}
                placeholder="40"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={fixedPrice}
              onChange={(e) => setFixedPrice(e.target.checked)}
              className="size-4 rounded border-input"
            />
            {t('dashboard.projects.fixedPrice')}
          </label>

          <MemberPicker
            label={t('dashboard.projects.holders')}
            selected={holders}
            disabledIds={helpers}
            onToggle={toggle(holders, setHolders)}
          />
          <MemberPicker
            label={t('dashboard.projects.helpers')}
            selected={helpers}
            disabledIds={holders}
            onToggle={toggle(helpers, setHelpers)}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('dashboard.projects.cancel')}
            </Button>
            <Button type="submit" className="gap-2" disabled={isPending || !name.trim()}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? t('dashboard.projects.save') : t('dashboard.projects.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
