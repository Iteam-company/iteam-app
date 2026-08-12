import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Label } from '#/components/ui/label'
import { useCompanyMembers } from '#/lib/company/mutations'

/**
 * Toggleable pill list of company members. `disabledIds` greys out people who
 * are already taken by the other role — a person cannot be holder and helper on
 * the same project.
 */
export function MemberPicker({
  label,
  selected,
  onToggle,
  disabledIds = [],
}: {
  label: string
  selected: number[]
  onToggle: (userId: number) => void
  disabledIds?: number[]
}) {
  const { t } = useTranslation()
  const { data: page, isLoading } = useCompanyMembers({ limit: 100 })
  const members = page?.data ?? []

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {isLoading ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : members.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t('dashboard.projects.noMembers')}
        </p>
      ) : (
        <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-md border border-input p-2">
          {members.map((member) => {
            const isSelected = selected.includes(member.id)
            const isDisabled = disabledIds.includes(member.id)
            return (
              <button
                key={member.id}
                type="button"
                disabled={isDisabled}
                onClick={() => onToggle(member.id)}
                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                } ${isDisabled ? 'cursor-not-allowed opacity-40' : ''}`}
              >
                {member.fullName}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
