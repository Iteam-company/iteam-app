import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useReactFlow,
} from '@xyflow/react'
import type { Connection, Edge, Node, NodeChange } from '@xyflow/react'
import { useTranslation } from 'react-i18next'
import '@xyflow/react/dist/style.css'
import { useIsDark } from '#/hooks/use-is-dark'
import type { FinanceSheet } from '#/lib/finances/types'
import {
  useCreateEdge,
  useDeleteEdge,
  useMoveNode,
} from '#/lib/finances/mutations'
import { SheetActionsContext, nodeTypes } from './nodes'
import type { SheetActions } from './nodes'
import { nodeAmount } from './presentation'

const DEFAULT_EDGE_OPTIONS = {
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
  style: { strokeWidth: 1.5 },
}
const FIT_VIEW_OPTIONS = { padding: 0.25, maxZoom: 1 }

const NODE_TYPE_BY_KIND = {
  DESTINATION: 'destination',
  INCOME: 'income',
  NOTE: 'note',
} as const

/**
 * Builds the React Flow model from a sheet. Unlike the projects graph, the
 * positions come straight from the database — this board is arranged by hand.
 *
 * Destination boxes are given the total of every income box wired into them,
 * plus how much of it has actually landed, which is the number the sheet
 * exists to answer.
 */
function toFlow(sheet: FinanceSheet): { nodes: Node[]; edges: Edge[] } {
  const byId = new Map(sheet.nodes.map((n) => [n.id, n]))

  const totals = new Map<number, { total: number; received: number; currency: string | null }>()
  for (const edge of sheet.edges) {
    const source = byId.get(edge.sourceId)
    if (source?.kind !== 'INCOME') continue
    const bucket = totals.get(edge.targetId) ?? {
      total: 0,
      received: 0,
      currency: source.currency,
    }
    const value = nodeAmount(source)
    bucket.total += value
    if (source.status === 'TRANSFERRED') bucket.received += value
    // Mixed currencies can't be summed honestly, so drop the symbol entirely.
    if (bucket.currency !== source.currency) bucket.currency = null
    totals.set(edge.targetId, bucket)
  }

  const nodes: Node[] = sheet.nodes.map((node) => ({
    id: String(node.id),
    type: NODE_TYPE_BY_KIND[node.kind],
    position: { x: node.x, y: node.y },
    data:
      node.kind === 'DESTINATION'
        ? { node, ...(totals.get(node.id) ?? { total: 0, received: 0, currency: null }) }
        : { node },
  }))

  const edges: Edge[] = sheet.edges.map((edge) => ({
    id: String(edge.id),
    source: String(edge.sourceId),
    target: String(edge.targetId),
  }))

  return { nodes, edges }
}

/**
 * The `fitView` prop only fires once, so a box added afterwards can land
 * outside the viewport. Re-fit when the box count changes — dragging never
 * changes the count, so this does not fight the user mid-arrange.
 */
function FitOnCount({ count }: { count: number }) {
  const { fitView } = useReactFlow()
  useEffect(() => {
    fitView(FIT_VIEW_OPTIONS)
  }, [count, fitView])
  return null
}

export function SheetCanvas({
  sheet,
  actions,
}: {
  sheet: FinanceSheet
  actions: SheetActions
}) {
  const { t } = useTranslation()
  const isDark = useIsDark()
  const moveNode = useMoveNode()
  const createEdge = useCreateEdge()
  const deleteEdge = useDeleteEdge()

  const model = useMemo(() => toFlow(sheet), [sheet])

  // React Flow owns node positions while dragging; the server is the source of
  // truth between drags. Re-seed whenever the sheet payload changes.
  const [nodes, setNodes] = useState<Node[]>(model.nodes)
  const [edges, setEdges] = useState<Edge[]>(model.edges)
  useEffect(() => {
    setNodes(model.nodes)
    setEdges(model.edges)
  }, [model])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((current) => applyPositionChanges(current, changes))
  }, [])

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      moveNode.mutate({ id: Number(node.id), x: node.position.x, y: node.position.y })
    },
    [moveNode],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      // Draw it immediately; the invalidation that follows replaces this with
      // the server's version carrying the real edge id.
      setEdges((current) => addEdge(connection, current))
      createEdge.mutate({
        sheetId: sheet.id,
        sourceId: Number(connection.source),
        targetId: Number(connection.target),
      })
    },
    [createEdge, sheet.id],
  )

  const onEdgesDelete = useCallback(
    (removed: Edge[]) => {
      for (const edge of removed) {
        const id = Number(edge.id)
        if (Number.isFinite(id)) deleteEdge.mutate(id)
      }
    },
    [deleteEdge],
  )

  if (!sheet.nodes.length) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <p className="max-w-sm text-sm text-muted-foreground">
          {t('dashboard.finances.emptySheet')}
        </p>
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <SheetActionsContext.Provider value={actions}>
        <div className="h-full w-full" style={{ background: 'var(--background)' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
            colorMode={isDark ? 'dark' : 'light'}
            onNodesChange={onNodesChange}
            onNodeDragStop={onNodeDragStop}
            onConnect={onConnect}
            onEdgesDelete={onEdgesDelete}
            fitView
            fitViewOptions={FIT_VIEW_OPTIONS}
            panOnScroll
            zoomOnDoubleClick={false}
            minZoom={0.2}
            maxZoom={1.5}
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls showInteractive={false} />
            <FitOnCount count={sheet.nodes.length} />
          </ReactFlow>
        </div>
      </SheetActionsContext.Provider>
    </ReactFlowProvider>
  )
}

/**
 * Only position changes are applied locally. Additions and removals arrive via
 * the query cache instead, so applying them here too would double them up.
 */
function applyPositionChanges(current: Node[], changes: NodeChange[]): Node[] {
  let next = current
  for (const change of changes) {
    if (change.type !== 'position' || !change.position) continue
    const position = change.position
    next = next.map((node) =>
      node.id === change.id ? { ...node, position } : node,
    )
  }
  return next
}
