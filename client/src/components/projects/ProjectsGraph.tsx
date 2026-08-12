import { useEffect, useMemo } from 'react'
import {
  Background, BackgroundVariant, Controls, MarkerType,
  ReactFlow, ReactFlowProvider, useReactFlow,
} from '@xyflow/react'
import { useTranslation } from 'react-i18next'
import '@xyflow/react/dist/style.css'
import type { Project } from '#/lib/projects/types'
import { buildGraph } from './graph-layout'
import { GraphActionsContext, nodeTypes } from './nodes'
import type { GraphActions } from './nodes'
import { useIsDark } from './use-is-dark'

// Module-level constants — see the note on nodeTypes in nodes.tsx.
const DEFAULT_EDGE_OPTIONS = {
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
  style: { strokeWidth: 1.5 },
}
const FIT_VIEW_OPTIONS = { padding: 0.25, maxZoom: 1 }

/**
 * `fitView` as a prop only runs on init, so the viewport would drift out of
 * date as projects are added or removed. Re-fit whenever the node count moves.
 */
function FitOnChange({ count }: { count: number }) {
  const { fitView } = useReactFlow()
  useEffect(() => {
    fitView(FIT_VIEW_OPTIONS)
  }, [count, fitView])
  return null
}

export function ProjectsGraph({
  projects,
  actions,
}: {
  projects: Project[]
  actions: GraphActions
}) {
  const { t } = useTranslation()
  const isDark = useIsDark()
  const { nodes, edges } = useMemo(() => buildGraph(projects), [projects])

  if (!projects.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          {t('dashboard.projects.emptyGraph')}
        </p>
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <GraphActionsContext.Provider value={actions}>
        <div className="h-full w-full" style={{ background: 'var(--background)' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
            colorMode={isDark ? 'dark' : 'light'}
            fitView
            fitViewOptions={FIT_VIEW_OPTIONS}
            nodesDraggable={false}
            nodesConnectable={false}
            edgesFocusable={false}
            panOnScroll
            zoomOnDoubleClick={false}
            minZoom={0.2}
            maxZoom={1.5}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls showInteractive={false} />
            <FitOnChange count={nodes.length} />
          </ReactFlow>
        </div>
      </GraphActionsContext.Provider>
    </ReactFlowProvider>
  )
}
