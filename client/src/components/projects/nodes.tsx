import { createContext, useContext } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Node, NodeProps } from '@xyflow/react'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2, UserPlus, X } from 'lucide-react'
import type {
  HelperNodeData,
  HolderNodeData,
  ProjectNodeData,
} from './graph-layout'
import type { Project, ProjectRole } from '#/lib/projects/types'

// ── Actions ───────────────────────────────────────────────────────────────────
// Passed by context rather than through node `data` so the layout stays plain
// serialisable data and does not change identity when a callback does.

export interface GraphActions {
  onEditProject: (project: Project) => void
  onDeleteProject: (project: Project) => void
  onAddPeople: (project: Project, role: ProjectRole) => void
  onRemovePerson: (projectId: number, userId: number) => void
  onOpenPerson: (userId: number) => void
}

export const GraphActionsContext = createContext<GraphActions | null>(null)

function useGraphActions() {
  const actions = useContext(GraphActionsContext)
  if (!actions) throw new Error('GraphActionsContext is missing')
  return actions
}

// ── Shared bits ───────────────────────────────────────────────────────────────

const CARD = 'w-[190px] rounded-xl px-3 py-2.5 shadow-md transition-shadow hover:shadow-lg'
// The `!` suffix is Tailwind v4's important modifier; needed because React
// Flow's stylesheet sets width/height/background on .react-flow__handle.
const HANDLE = 'size-2! border-0! bg-white/60!'

/** Small round action button revealed on node hover. */
function NodeAction({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="flex size-5 items-center justify-center rounded-md bg-white/20 text-white transition-colors hover:bg-white/35"
    >
      {children}
    </button>
  )
}

// ── Holder (purple) ───────────────────────────────────────────────────────────

function HolderNode({ data }: NodeProps<Node<HolderNodeData, 'holder'>>) {
  const { t } = useTranslation()
  const { onOpenPerson } = useGraphActions()

  return (
    <div
      onClick={() => onOpenPerson(data.userId)}
      className={`${CARD} cursor-pointer bg-violet-600 text-white ring-1 ring-violet-400/40`}
    >
      <p className="truncate text-sm font-semibold">{data.name}</p>
      <p className="mt-0.5 text-[11px] text-violet-100">
        {data.hours > 0
          ? `${data.hours} ${t('dashboard.projects.hoursShort')} · `
          : ''}
        {t('dashboard.projects.projectCount', { count: data.projectCount })}
      </p>
      <Handle type="source" position={Position.Bottom} className={HANDLE} />
    </div>
  )
}

// ── Project (red) ─────────────────────────────────────────────────────────────

function ProjectNode({ data }: NodeProps<Node<ProjectNodeData, 'project'>>) {
  const { t } = useTranslation()
  const { onEditProject, onDeleteProject, onAddPeople } = useGraphActions()
  const { project } = data

  return (
    <div className={`${CARD} group bg-rose-600 text-white ring-1 ring-rose-400/40`}>
      <Handle type="target" position={Position.Top} className={HANDLE} />

      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{project.name}</p>
        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <NodeAction
            label={t('dashboard.projects.addHelper')}
            onClick={() => onAddPeople(project, 'HELPER')}
          >
            <UserPlus className="size-3" />
          </NodeAction>
          <NodeAction
            label={t('dashboard.projects.edit')}
            onClick={() => onEditProject(project)}
          >
            <Pencil className="size-3" />
          </NodeAction>
          <NodeAction
            label={t('dashboard.projects.delete')}
            onClick={() => onDeleteProject(project)}
          >
            <Trash2 className="size-3" />
          </NodeAction>
        </div>
      </div>

      <p className="mt-0.5 truncate text-[11px] text-rose-100">
        {project.country || '—'} ·{' '}
        {project.hours != null
          ? `${project.hours} ${t('dashboard.projects.hoursShort')}`
          : t('dashboard.projects.fixedPrice')}
      </p>

      <Handle type="source" position={Position.Bottom} className={HANDLE} />
    </div>
  )
}

// ── Helper (cyan) ─────────────────────────────────────────────────────────────

function HelperNode({ data }: NodeProps<Node<HelperNodeData, 'helper'>>) {
  const { t } = useTranslation()
  const { onRemovePerson, onOpenPerson } = useGraphActions()

  return (
    <div className={`${CARD} group bg-cyan-600 text-white ring-1 ring-cyan-400/40`}>
      <Handle type="target" position={Position.Top} className={HANDLE} />

      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpenPerson(data.userId)}
          className="min-w-0 flex-1 truncate text-left text-sm font-semibold"
        >
          {data.name}
        </button>
        <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
          <NodeAction
            label={t('dashboard.projects.removePerson')}
            onClick={() => onRemovePerson(data.projectId, data.userId)}
          >
            <X className="size-3" />
          </NodeAction>
        </div>
      </div>

      {data.occupation && (
        <p className="mt-0.5 truncate text-[11px] text-cyan-100">{data.occupation}</p>
      )}
    </div>
  )
}

// Must be a module-level constant: a fresh object each render makes React Flow
// warn and remount every node.
export const nodeTypes = {
  holder: HolderNode,
  project: ProjectNode,
  helper: HelperNode,
}
