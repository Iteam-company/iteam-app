import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { financesApi } from './api'
import type {
  CreateEdgeRequest,
  CreateNodeRequest,
  CreateSheetRequest,
  UpdateNodeRequest,
} from './types'

export const SHEETS_KEY = ['finance', 'sheets'] as const
export const sheetKey = (id: number) => ['finance', 'sheet', id] as const
export const TEMPLATE_KEY = ['finance', 'template'] as const

// ── Queries ───────────────────────────────────────────────────────────────────

export function useFinanceSheets() {
  return useQuery({
    queryKey: SHEETS_KEY,
    queryFn: () => financesApi.listSheets(),
    retry: false,
  })
}

export function useFinanceSheet(id: number | undefined) {
  return useQuery({
    queryKey: sheetKey(id ?? 0),
    queryFn: () => financesApi.getSheet(id!),
    enabled: id !== undefined,
    retry: false,
  })
}

/** The template is created server-side on first access. */
export function useFinanceTemplate(enabled = true) {
  return useQuery({
    queryKey: TEMPLATE_KEY,
    queryFn: () => financesApi.getTemplate(),
    enabled,
    retry: false,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Every box/arrow mutation invalidates the whole sheet rather than patching the
 * cache: the canvas is one document and a stale node would leave a dangling
 * arrow. Sheets are small, so a refetch is cheap.
 */
function useSheetInvalidation() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['finance'] })
  }
}

export function useCreateSheet() {
  const invalidate = useSheetInvalidation()
  return useMutation({
    mutationFn: (body: CreateSheetRequest) => financesApi.createSheet(body),
    onSuccess: invalidate,
  })
}

export function useDeleteSheet() {
  const invalidate = useSheetInvalidation()
  return useMutation({
    mutationFn: (id: number) => financesApi.removeSheet(id),
    onSuccess: invalidate,
  })
}

export function useCreateNode() {
  const invalidate = useSheetInvalidation()
  return useMutation({
    mutationFn: ({ sheetId, ...body }: CreateNodeRequest & { sheetId: number }) =>
      financesApi.createNode(sheetId, body),
    onSuccess: invalidate,
  })
}

export function useUpdateNode() {
  const invalidate = useSheetInvalidation()
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateNodeRequest & { id: number }) =>
      financesApi.updateNode(id, body),
    onSuccess: invalidate,
  })
}

/**
 * Dragging persists the new position but must not invalidate — a refetch
 * mid-drag would snap the box back under the cursor. React Flow already holds
 * the moved position locally, and the next full load reads it from the server.
 */
export function useMoveNode() {
  return useMutation({
    mutationFn: ({ id, x, y }: { id: number; x: number; y: number }) =>
      financesApi.updateNode(id, { x, y }),
  })
}

export function useDeleteNode() {
  const invalidate = useSheetInvalidation()
  return useMutation({
    mutationFn: (id: number) => financesApi.removeNode(id),
    onSuccess: invalidate,
  })
}

export function useCreateEdge() {
  const invalidate = useSheetInvalidation()
  return useMutation({
    mutationFn: ({ sheetId, ...body }: CreateEdgeRequest & { sheetId: number }) =>
      financesApi.createEdge(sheetId, body),
    onSuccess: invalidate,
  })
}

export function useDeleteEdge() {
  const invalidate = useSheetInvalidation()
  return useMutation({
    mutationFn: (id: number) => financesApi.removeEdge(id),
    onSuccess: invalidate,
  })
}
