import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Play, Plus, Trash2, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/StatusBadge'

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [newCompetitor, setNewCompetitor] = useState({ name: '', url: '' })
  const [showCompetitorForm, setShowCompetitorForm] = useState(false)

  const { data: client } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => api.clients.get(clientId!),
    enabled: !!clientId,
  })

  const { data: runs = [] } = useQuery({
    queryKey: ['runs', clientId],
    queryFn: () => api.runs.list(clientId!),
    enabled: !!clientId,
    refetchInterval: (query) => {
      const runs = query.state.data
      if (!runs) return false
      const hasActive = runs.some(r => r.status === 'pending' || r.status === 'running')
      return hasActive ? 3000 : false
    },
  })

  const { data: competitors = [] } = useQuery({
    queryKey: ['competitors', clientId],
    queryFn: () => api.competitors.list(clientId!),
    enabled: !!clientId,
  })

  const triggerRun = useMutation({
    mutationFn: (deepScan: boolean) => api.runs.trigger(clientId!, { triggered_by: 'team', deep_scan: deepScan }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['runs', clientId] }),
  })

  const addCompetitor = useMutation({
    mutationFn: () => api.competitors.add(clientId!, { ...newCompetitor, added_by: 'team' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['competitors', clientId] }); setNewCompetitor({ name: '', url: '' }); setShowCompetitorForm(false) },
  })

  const removeCompetitor = useMutation({
    mutationFn: (id: string) => api.competitors.remove(clientId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['competitors', clientId] }),
  })

  if (!client) return <p className="text-muted-foreground text-sm">Loading…</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/clients')} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <a href={client.website_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline">
            {client.website_url} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Client info */}
        <div className="col-span-2 border rounded-lg p-4 space-y-2 bg-card">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Client Info</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Industry:</span> {client.industry || '—'}</div>
            <div><span className="text-muted-foreground">Added:</span> {formatDate(client.created_at)}</div>
            {client.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {client.notes}</div>}
          </div>
        </div>

        {/* Run Analysis */}
        <div className="border rounded-lg p-4 bg-card space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Analysis</h2>
          <button
            onClick={() => triggerRun.mutate(false)}
            disabled={triggerRun.isPending}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {triggerRun.isPending ? 'Starting…' : 'Run Analysis'}
          </button>
          <button
            onClick={() => triggerRun.mutate(true)}
            disabled={triggerRun.isPending}
            className="w-full flex items-center justify-center gap-2 border px-4 py-2 rounded-md text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Run (Deep Scan)
          </button>
        </div>
      </div>

      {/* Competitors */}
      <div className="border rounded-lg p-4 bg-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Manual Competitors</h2>
          <button onClick={() => setShowCompetitorForm(s => !s)} className="flex items-center gap-1 text-sm text-primary hover:underline">
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        {showCompetitorForm && (
          <div className="flex gap-2 items-end">
            <div>
              <label className="text-xs font-medium">Name</label>
              <input className="mt-1 border rounded px-2 py-1 text-sm w-40" value={newCompetitor.name} onChange={e => setNewCompetitor(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium">URL</label>
              <input className="mt-1 border rounded px-2 py-1 text-sm w-48" value={newCompetitor.url} onChange={e => setNewCompetitor(f => ({ ...f, url: e.target.value }))} />
            </div>
            <button onClick={() => addCompetitor.mutate()} disabled={!newCompetitor.name} className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm disabled:opacity-50">Add</button>
          </div>
        )}
        {competitors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No manual competitors added yet. They'll be auto-discovered on analysis.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {competitors.map(c => (
              <div key={c.id} className="flex items-center gap-1 bg-muted rounded-full px-3 py-1 text-sm">
                {c.name}
                <button onClick={() => removeCompetitor.mutate(c.id)} className="text-muted-foreground hover:text-destructive ml-1">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Run history */}
      <div className="space-y-2">
        <h2 className="font-semibold">Analysis History</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No runs yet.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Triggered by</th>
                  <th className="text-left px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {runs.map(run => {
                  const duration = run.started_at && run.completed_at
                    ? `${Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s`
                    : '—'
                  return (
                    <tr key={run.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">{formatDate(run.created_at)}</td>
                      <td className="px-4 py-3"><StatusBadge status={run.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{run.triggered_by || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{duration}</td>
                      <td className="px-4 py-3">
                        {run.status === 'completed' && (
                          <Link to={`/clients/${clientId}/runs/${run.id}`} className="text-primary hover:underline text-xs">View →</Link>
                        )}
                        {run.status === 'failed' && <span className="text-destructive text-xs" title={run.error_message || ''}>Failed</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
