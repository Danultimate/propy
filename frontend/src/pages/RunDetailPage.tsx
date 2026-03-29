import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Download, RefreshCw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { api, type TechItem } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/StatusBadge'

export default function RunDetailPage() {
  const { clientId, runId } = useParams<{ clientId: string; runId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: run } = useQuery({
    queryKey: ['run', clientId, runId],
    queryFn: () => api.runs.get(clientId!, runId!),
    enabled: !!clientId && !!runId,
    refetchInterval: (query) => {
      const run = query.state.data
      if (!run) return false
      return run.status === 'pending' || run.status === 'running' ? 3000 : false
    },
  })

  const { data: client } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => api.clients.get(clientId!),
    enabled: !!clientId,
  })

  const [activeTab, setActiveTab] = useState<'tech' | 'company' | 'proposal'>('proposal')

  const regenerate = useMutation({
    mutationFn: () => api.runs.regenerate(clientId!, runId!),
    onSuccess: (newRun) => {
      qc.invalidateQueries({ queryKey: ['runs', clientId] })
      navigate(`/clients/${clientId}/runs/${newRun.id}`)
    },
  })

  if (!run) return <p className="text-sm text-muted-foreground">Loading…</p>

  const result = run.result

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/clients/${clientId}`)} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Analysis Run</h1>
            <StatusBadge status={run.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {client?.name} · {formatDate(run.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          {result?.ai_proposal && (
            <button
              onClick={() => regenerate.mutate()}
              disabled={regenerate.isPending}
              className="flex items-center gap-2 border px-3 py-1.5 rounded-md text-sm hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" /> Regenerate Proposal
            </button>
          )}
          {result?.pdf_path && (
            <a
              href={api.runs.pdfUrl(clientId!, runId!)}
              download
              className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm hover:bg-primary/90"
            >
              <Download className="h-4 w-4" /> Export PDF
            </a>
          )}
        </div>
      </div>

      {run.status === 'running' && (
        <div className="border rounded-lg p-4 bg-blue-50 text-blue-800 text-sm animate-pulse">
          Analysis in progress… results will appear automatically.
        </div>
      )}

      {run.status === 'failed' && (
        <div className="border rounded-lg p-4 bg-red-50 text-red-800 text-sm">
          <strong>Failed:</strong> {run.error_message}
        </div>
      )}

      {result && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 border-b">
            {(['proposal', 'tech', 'company'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
                  activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'tech' ? 'Tech Stack' : tab === 'company' ? 'Company & Competitors' : 'AI Proposal'}
              </button>
            ))}
          </div>

          {activeTab === 'proposal' && (
            <div className="prose prose-sm max-w-none border rounded-lg p-6 bg-card">
              {result.ai_proposal
                ? <ReactMarkdown>{result.ai_proposal}</ReactMarkdown>
                : <p className="text-muted-foreground">Proposal not yet generated.</p>
              }
            </div>
          )}

          {activeTab === 'tech' && (
            <div className="space-y-4">
              <TechSection title="Surface Detection" items={result.tech_stack?.surface ?? []} />
              <TechSection title="Deep Scan" items={result.tech_stack?.deep ?? []} />
            </div>
          )}

          {activeTab === 'company' && (
            <div className="space-y-4">
              {result.company_summary && (
                <div className="border rounded-lg p-4 bg-card">
                  <h3 className="font-semibold mb-2">Company Summary</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.company_summary}</p>
                </div>
              )}
              {result.competitors && result.competitors.length > 0 && (
                <div className="border rounded-lg p-4 bg-card">
                  <h3 className="font-semibold mb-3">Competitors</h3>
                  <div className="space-y-3">
                    {result.competitors.map((c, i) => (
                      <div key={i} className="flex items-start justify-between gap-4 text-sm">
                        <div>
                          <span className="font-medium">{c.name}</span>
                          {c.notes && <p className="text-muted-foreground mt-0.5">{c.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">{c.url}</a>}
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${c.source === 'manual' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                            {c.source}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TechSection({ title, items }: { title: string; items: TechItem[] }) {
  return (
    <div className="border rounded-lg p-4 bg-card">
      <h3 className="font-semibold mb-3">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <div key={i} className="flex flex-col items-start bg-muted rounded-md px-3 py-1.5">
              <span className="text-sm font-medium">{item.name}</span>
              <span className="text-xs text-muted-foreground">{item.category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

