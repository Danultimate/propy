const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail || 'Request failed')
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// Clients
export const api = {
  clients: {
    list: () => request<Client[]>('/clients'),
    get: (id: string) => request<Client>(`/clients/${id}`),
    create: (data: ClientCreate) => request<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<ClientCreate>) => request<Client>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/clients/${id}`, { method: 'DELETE' }),
  },
  runs: {
    list: (clientId: string) => request<AnalysisRun[]>(`/clients/${clientId}/runs`),
    get: (clientId: string, runId: string) => request<AnalysisRun>(`/clients/${clientId}/runs/${runId}`),
    trigger: (clientId: string, data: RunCreate) => request<AnalysisRun>(`/clients/${clientId}/runs`, { method: 'POST', body: JSON.stringify(data) }),
    regenerate: (clientId: string, runId: string) => request<AnalysisRun>(`/clients/${clientId}/runs/${runId}/regenerate`, { method: 'POST' }),
    pdfUrl: (clientId: string, runId: string) => `${BASE}/clients/${clientId}/runs/${runId}/pdf`,
  },
  competitors: {
    list: (clientId: string) => request<CompetitorOverride[]>(`/clients/${clientId}/competitors`),
    add: (clientId: string, data: CompetitorCreate) => request<CompetitorOverride>(`/clients/${clientId}/competitors`, { method: 'POST', body: JSON.stringify(data) }),
    remove: (clientId: string, competitorId: string) => request<void>(`/clients/${clientId}/competitors/${competitorId}`, { method: 'DELETE' }),
  },
  config: {
    providers: () => request<{ providers: string[]; active: string }>('/config/providers'),
    setProvider: (provider: string) => request<{ active: string }>('/config/provider', { method: 'PATCH', body: JSON.stringify({ provider }) }),
  },
}

// Types
export interface Client {
  id: string
  name: string
  website_url: string
  industry: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ClientCreate {
  name: string
  website_url: string
  industry?: string
  notes?: string
}

export interface RunCreate {
  triggered_by?: string
  deep_scan?: boolean
}

export interface AnalysisResult {
  id: string
  run_id: string
  tech_stack: { surface: TechItem[]; deep: TechItem[] } | null
  company_summary: string | null
  competitors: Competitor[] | null
  ai_proposal: string | null
  pdf_path: string | null
  created_at: string
}

export interface AnalysisRun {
  id: string
  client_id: string
  triggered_by: string | null
  status: 'pending' | 'running' | 'completed' | 'failed'
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  created_at: string
  result: AnalysisResult | null
}

export interface TechItem {
  name: string
  category: string
  source?: string
}

export interface Competitor {
  name: string
  url: string
  notes: string
  source: 'auto' | 'manual'
}

export interface CompetitorOverride {
  id: string
  client_id: string
  name: string
  url: string | null
  added_by: string | null
  created_at: string
}

export interface CompetitorCreate {
  name: string
  url?: string
  added_by?: string
}
