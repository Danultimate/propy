import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, ExternalLink, Trash2 } from 'lucide-react'
import { api, type ClientCreate } from '@/lib/api'
import { formatDate } from '@/lib/utils'

export default function ClientsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ClientCreate>({ name: '', website_url: '', industry: '', notes: '' })

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: api.clients.list,
  })

  const createMutation = useMutation({
    mutationFn: api.clients.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); setShowForm(false); setForm({ name: '', website_url: '', industry: '', notes: '' }) },
  })

  const deleteMutation = useMutation({
    mutationFn: api.clients.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-muted-foreground text-sm mt-1">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Client
        </button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 bg-card space-y-3">
          <h2 className="font-semibold">New Client</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <input className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Website *</label>
              <input className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm" placeholder="https://..." value={form.website_url} onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Industry</label>
              <input className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <input className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.name || !form.website_url || createMutation.isPending}
              className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium disabled:opacity-50"
            >
              {createMutation.isPending ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-1.5 rounded-md text-sm border">Cancel</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>No clients yet. Add your first one.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Website</th>
                <th className="text-left px-4 py-3 font-medium">Industry</th>
                <th className="text-left px-4 py-3 font-medium">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {clients.map(client => (
                <tr key={client.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/clients/${client.id}`)}>
                  <td className="px-4 py-3 font-medium">{client.name}</td>
                  <td className="px-4 py-3">
                    <a href={client.website_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-primary hover:underline">
                      {client.website_url.replace(/^https?:\/\//, '')} <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{client.industry || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(client.created_at)}</td>
                  <td className="px-4 py-3">
                    <button onClick={e => { e.stopPropagation(); deleteMutation.mutate(client.id) }} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
