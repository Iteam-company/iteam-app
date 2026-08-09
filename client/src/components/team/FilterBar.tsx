import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import type { CompanyRole } from '#/lib/company/types'

const PILL_LIMIT = 4

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    >
      {children}
    </button>
  )
}

export function FilterBar({
  occupations,
  activeOccupation,
  onOccupationChange,
}: {
  occupations: CompanyRole[]
  activeOccupation?: string
  onOccupationChange: (v: string | undefined) => void
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const visible = expanded ? occupations : occupations.slice(0, PILL_LIMIT)
  const hidden = occupations.length - PILL_LIMIT
  // Always show the active pill even when collapsed
  const activeIsHidden =
    !expanded &&
    activeOccupation !== undefined &&
    !occupations.slice(0, PILL_LIMIT).some((r) => r.name === activeOccupation)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterPill active={!activeOccupation} onClick={() => onOccupationChange(undefined)}>
        {t('dashboard.team.filterAll')}
      </FilterPill>

      {visible.map((r) => (
        <FilterPill
          key={r.id}
          active={activeOccupation === r.name}
          onClick={() => onOccupationChange(r.name)}
        >
          {r.name}
        </FilterPill>
      ))}

      {/* Show active pill when it's hidden in collapsed state */}
      {activeIsHidden && (
        <FilterPill active onClick={() => onOccupationChange(activeOccupation)}>
          {activeOccupation}
        </FilterPill>
      )}

      {hidden > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground bg-muted hover:bg-muted/80 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronDown className="size-3 rotate-180" />
              {t('dashboard.team.showLess')}
            </>
          ) : (
            <>
              <ChevronDown className="size-3" />
              {`+${hidden}`}
            </>
          )}
        </button>
      )}
    </div>
  )
}
