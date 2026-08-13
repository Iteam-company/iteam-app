import { api } from '#/lib/api'
import type {
  CreateEdgeRequest,
  CreateNodeRequest,
  CreateSheetRequest,
  FinanceEdge,
  FinanceNode,
  FinanceSheet,
  FinanceSheetSummary,
  UpdateNodeRequest,
} from './types'

export const financesApi = {
  listSheets: () => api.get<FinanceSheetSummary[]>('/finance/sheets'),
  getSheet: (id: number) => api.get<FinanceSheet>(`/finance/sheets/${id}`),
  getTemplate: () => api.get<FinanceSheet>('/finance/template'),
  createSheet: (body: CreateSheetRequest) =>
    api.post<FinanceSheet>('/finance/sheets', body),
  removeSheet: (id: number) =>
    api.delete<{ deleted: boolean }>(`/finance/sheets/${id}`),

  createNode: (sheetId: number, body: CreateNodeRequest) =>
    api.post<FinanceNode>(`/finance/sheets/${sheetId}/nodes`, body),
  updateNode: (id: number, body: UpdateNodeRequest) =>
    api.patch<FinanceNode>(`/finance/nodes/${id}`, body),
  removeNode: (id: number) =>
    api.delete<{ deleted: boolean }>(`/finance/nodes/${id}`),

  createEdge: (sheetId: number, body: CreateEdgeRequest) =>
    api.post<FinanceEdge>(`/finance/sheets/${sheetId}/edges`, body),
  removeEdge: (id: number) =>
    api.delete<{ deleted: boolean }>(`/finance/edges/${id}`),
}
