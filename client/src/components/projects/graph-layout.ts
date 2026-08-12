import type { Edge, Node } from '@xyflow/react'
import type { Project, ProjectMemberUser } from '#/lib/projects/types'

// ── Geometry ──────────────────────────────────────────────────────────────────

export const NODE_W = 190
const GAP_X = 28
const SLOT = NODE_W + GAP_X
const GROUP_GAP = GAP_X * 2

/** Three fixed rows, top to bottom: holder → project → helper. */
const ROW_Y = { holder: 0, project: 180, helper: 360 }

/** Group key used for projects that have no holder yet. */
const NO_HOLDER = -1

// ── Node data ─────────────────────────────────────────────────────────────────
// Declared as type aliases, not interfaces: React Flow's Node<T> requires T to
// be assignable to Record<string, unknown>, which interfaces are not.

export type HolderNodeData = {
  userId: number
  name: string
  /** Sum of the hours of every project this person holds. */
  hours: number
  projectCount: number
}

export type ProjectNodeData = {
  project: Project
}

export type HelperNodeData = {
  projectId: number
  userId: number
  name: string
  occupation: string | null
}

export type ProjectsFlowNode =
  | Node<HolderNodeData, 'holder'>
  | Node<ProjectNodeData, 'project'>
  | Node<HelperNodeData, 'helper'>

// ── Layout ────────────────────────────────────────────────────────────────────

/**
 * Lays the whole company out as a three-row tree. Positions are derived from
 * the data on every render and never persisted, so the arrangement is identical
 * for everyone and survives a reload.
 *
 * Packing runs bottom-up: each helper claims a slot, the project centres over
 * its helpers, and the holder centres over its projects.
 *
 * Helper nodes are keyed per project (`helper-{projectId}-{userId}`), so one
 * person helping on three projects renders three nodes and the graph stays a
 * tree. Holder nodes are keyed per person, so a holder owning three projects is
 * a single node with three outgoing edges — matching the reference diagram.
 */
export function buildGraph(projects: Project[]): {
  nodes: ProjectsFlowNode[]
  edges: Edge[]
} {
  const nodes: ProjectsFlowNode[] = []
  const edges: Edge[] = []

  // 1. Aggregate hours per holder across every project they hold.
  const totals = new Map<
    number,
    { user: ProjectMemberUser; hours: number; count: number }
  >()
  for (const project of projects) {
    for (const member of project.members) {
      if (member.role !== 'HOLDER') continue
      const total = totals.get(member.userId) ?? {
        user: member.user,
        hours: 0,
        count: 0,
      }
      total.hours += project.hours ?? 0
      total.count += 1
      totals.set(member.userId, total)
    }
  }

  // 2. Each project is packed under one primary holder. A project shared by
  //    several holders still gets an edge from each of them (step 6).
  const groups = new Map<number, Project[]>()
  for (const project of projects) {
    const holderIds = project.members
      .filter((m) => m.role === 'HOLDER')
      .map((m) => m.userId)
    const key = holderIds.length ? Math.min(...holderIds) : NO_HOLDER
    groups.set(key, [...(groups.get(key) ?? []), project])
  }

  // 3. Stable column order — by holder name, unheld projects last. Without this
  //    the graph reshuffles every time a mutation invalidates the query.
  const orderedKeys = [...groups.keys()].sort((a, b) => {
    if (a === NO_HOLDER) return 1
    if (b === NO_HOLDER) return -1
    const nameA = totals.get(a)?.user.fullName ?? ''
    const nameB = totals.get(b)?.user.fullName ?? ''
    return nameA.localeCompare(nameB)
  })

  // 4. Pack the columns.
  let cursor = 0
  const placedHolders = new Set<number>()

  for (const key of orderedKeys) {
    const projectXs: number[] = []

    for (const project of groups.get(key)!) {
      const helpers = project.members.filter((m) => m.role === 'HELPER')
      const helperXs: number[] = []

      for (const helper of helpers) {
        helperXs.push(cursor)
        nodes.push({
          id: helperNodeId(project.id, helper.userId),
          type: 'helper',
          position: { x: cursor, y: ROW_Y.helper },
          data: {
            projectId: project.id,
            userId: helper.userId,
            name: helper.user.fullName,
            occupation: helper.user.occupation,
          },
        })
        edges.push({
          id: `edge-p${project.id}-h${helper.userId}`,
          source: projectNodeId(project.id),
          target: helperNodeId(project.id, helper.userId),
        })
        cursor += SLOT
      }

      // A project with no helpers still reserves a slot so columns never overlap.
      if (!helpers.length) cursor += SLOT

      const projectX = helperXs.length
        ? (helperXs[0] + helperXs[helperXs.length - 1]) / 2
        : cursor - SLOT
      projectXs.push(projectX)

      nodes.push({
        id: projectNodeId(project.id),
        type: 'project',
        position: { x: projectX, y: ROW_Y.project },
        data: { project },
      })
    }

    if (key !== NO_HOLDER) {
      const total = totals.get(key)!
      nodes.push({
        id: holderNodeId(key),
        type: 'holder',
        position: {
          x: (projectXs[0] + projectXs[projectXs.length - 1]) / 2,
          y: ROW_Y.holder,
        },
        data: {
          userId: key,
          name: total.user.fullName,
          hours: total.hours,
          projectCount: total.count,
        },
      })
      placedHolders.add(key)
    }

    cursor += GROUP_GAP
  }

  // 5. Someone who is only ever a *secondary* holder never owned a column, so
  //    they have no node yet and their edges would dangle. Park them at the end
  //    of the holder row.
  for (const [userId, total] of totals) {
    if (placedHolders.has(userId)) continue
    nodes.push({
      id: holderNodeId(userId),
      type: 'holder',
      position: { x: cursor, y: ROW_Y.holder },
      data: {
        userId,
        name: total.user.fullName,
        hours: total.hours,
        projectCount: total.count,
      },
    })
    cursor += SLOT
  }

  // 6. Holder → project edges, including from non-primary holders.
  for (const project of projects) {
    for (const member of project.members) {
      if (member.role !== 'HOLDER') continue
      edges.push({
        id: `edge-h${member.userId}-p${project.id}`,
        source: holderNodeId(member.userId),
        target: projectNodeId(project.id),
      })
    }
  }

  return { nodes, edges }
}

// ── Node ids ──────────────────────────────────────────────────────────────────

const holderNodeId = (userId: number) => `holder-${userId}`
const projectNodeId = (projectId: number) => `project-${projectId}`
const helperNodeId = (projectId: number, userId: number) =>
  `helper-${projectId}-${userId}`
