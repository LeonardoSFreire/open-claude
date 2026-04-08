import { useEffect, useState, useCallback } from 'react'
import { ExternalLink, Play, Square, RefreshCw, Plus, Pencil, Trash2, X, Monitor } from 'lucide-react'
import { api } from '../lib/api'

interface SystemApp {
  id: number
  name: string
  description: string
  url: string
  container: string
  icon: string
  type: string
  running: boolean | null
  status_detail: string
}

interface SystemForm {
  name: string
  description: string
  url: string
  container: string
  icon: string
  type: string
}

const emptyForm: SystemForm = { name: '', description: '', url: '', container: '', icon: '📦', type: 'docker' }

const ICONS = ['📦', '🌐', '🚀', '🏥', '🎤', '📊', '🔧', '💬', '🤖', '📱', '🎮', '🛒']

export default function Systems() {
  const [apps, setApps] = useState<SystemApp[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [viewApp, setViewApp] = useState<SystemApp | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<SystemForm>(emptyForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchApps = useCallback(() => {
    api.get('/systems')
      .then((data: SystemApp[]) => setApps(Array.isArray(data) ? data : []))
      .catch(() => setApps([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchApps() }, [fetchApps])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  const openEdit = (app: SystemApp) => {
    setEditingId(app.id)
    setForm({
      name: app.name,
      description: app.description || '',
      url: app.url || '',
      container: app.container || '',
      icon: app.icon || '📦',
      type: app.type || 'docker',
    })
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.name.trim()) { setError('Name is required'); return }
    setSubmitting(true)
    try {
      if (editingId) {
        await api.put(`/systems/${editingId}`, form)
      } else {
        await api.post('/systems', form)
      }
      setModalOpen(false)
      fetchApps()
    } catch (ex: unknown) {
      setError(ex instanceof Error ? ex.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (app: SystemApp) => {
    if (!confirm(`Delete "${app.name}"?`)) return
    try {
      await api.delete(`/systems/${app.id}`)
      fetchApps()
    } catch { /* ignore */ }
  }

  const handleAction = async (app: SystemApp, action: 'start' | 'stop' | 'update') => {
    setActionLoading(app.id)
    try {
      await api.post(`/systems/${app.id}/${action}`)
      setTimeout(() => { fetchApps(); setActionLoading(null) }, 2000)
    } catch {
      setActionLoading(null)
    }
  }

  if (viewApp) {
    return (
      <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setViewApp(null)} className="text-[#00FFA7] text-sm hover:underline">
              &larr; Back
            </button>
            <h1 className="text-xl font-bold text-[#F9FAFB]">{viewApp.name}</h1>
            {viewApp.running !== null && (
              <span className={`text-xs px-2 py-0.5 rounded ${viewApp.running ? 'bg-[#00FFA7]/10 text-[#00FFA7]' : 'bg-red-500/10 text-red-400'}`}>
                {viewApp.running ? 'Running' : 'Stopped'}
              </span>
            )}
          </div>
          <a href={viewApp.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#667085] hover:text-[#00FFA7] transition-colors">
            Open in new tab <ExternalLink size={12} />
          </a>
        </div>
        <div className="flex-1 bg-[#182230] border border-[#344054] rounded-xl overflow-hidden">
          <iframe src={viewApp.url} className="w-full h-full border-0" title={viewApp.name} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#F9FAFB]">Systems</h1>
          <p className="text-[#667085] mt-1">Registered applications and services</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setLoading(true); fetchApps() }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-[#D0D5DD] hover:text-[#00FFA7] transition-colors"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00FFA7] text-[#0C111D] font-semibold text-sm hover:bg-[#00FFA7]/90 transition-colors"
          >
            <Plus size={16} /> Add System
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      ) : apps.length === 0 ? (
        <div className="text-center py-16">
          <Monitor size={48} className="mx-auto text-[#344054] mb-4" />
          <p className="text-[#667085] mb-4">No systems registered yet.</p>
          <button onClick={openCreate} className="text-[#00FFA7] text-sm hover:underline">
            Add your first system
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {apps.map(app => (
            <div key={app.id} className="bg-[#182230] border border-[#344054] rounded-xl p-6 hover:border-[#00FFA7]/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{app.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-[#F9FAFB]">{app.name}</h3>
                    <p className="text-sm text-[#667085] mt-0.5">{app.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status */}
                  {app.running !== null && (
                    <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-lg ${
                      app.running ? 'bg-[#00FFA7]/10 text-[#00FFA7]' : 'bg-red-500/10 text-red-400'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${app.running ? 'bg-[#00FFA7] animate-pulse' : 'bg-red-400'}`} />
                      {app.running ? 'Running' : 'Stopped'}
                    </span>
                  )}

                  {/* Open */}
                  {app.url && (
                    <button
                      onClick={() => setViewApp(app)}
                      className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-[#00FFA7]/10 text-[#00FFA7] hover:bg-[#00FFA7]/20 transition-colors"
                    >
                      <ExternalLink size={14} /> Open
                    </button>
                  )}

                  {/* Docker actions */}
                  {app.container && (
                    <>
                      <button
                        onClick={() => handleAction(app, 'update')}
                        disabled={actionLoading === app.id}
                        className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === app.id ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />} Update
                      </button>

                      <button
                        onClick={() => handleAction(app, app.running ? 'stop' : 'start')}
                        disabled={actionLoading === app.id}
                        className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                          app.running
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            : 'bg-[#00FFA7]/10 text-[#00FFA7] hover:bg-[#00FFA7]/20'
                        }`}
                      >
                        {app.running ? <><Square size={14} /> Stop</> : <><Play size={14} /> Start</>}
                      </button>
                    </>
                  )}

                  {/* Edit / Delete */}
                  <button onClick={() => openEdit(app)} className="p-1.5 rounded text-[#667085] hover:text-white hover:bg-white/10 transition-colors" title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(app)} className="p-1.5 rounded text-[#667085] hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="mt-4 pt-4 border-t border-[#344054]/50 flex items-center gap-4 text-sm text-[#667085]">
                {app.container && (
                  <span>Container: <code className="text-[#D0D5DD] bg-black/20 px-1.5 py-0.5 rounded">{app.container}</code></span>
                )}
                {app.url && (
                  <span>URL: <a href={app.url} target="_blank" rel="noopener noreferrer" className="text-[#00FFA7] hover:underline">{app.url}</a></span>
                )}
                <span className="text-xs px-2 py-0.5 rounded bg-white/5">{app.type}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-[#182230] rounded-2xl border border-[#344054] p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{editingId ? 'Edit System' : 'Add System'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-[#667085] hover:text-white"><X size={18} /></button>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
            )}

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#D0D5DD] mb-1">Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0C111D] border border-[#344054] text-white text-sm focus:outline-none focus:border-[#00FFA7]"
                    placeholder="My App" />
                </div>
                <div className="w-20">
                  <label className="block text-sm font-medium text-[#D0D5DD] mb-1">Icon</label>
                  <div className="relative">
                    <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
                      className="w-full px-2 py-2 rounded-lg bg-[#0C111D] border border-[#344054] text-white text-lg text-center focus:outline-none focus:border-[#00FFA7] appearance-none">
                      {ICONS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#D0D5DD] mb-1">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0C111D] border border-[#344054] text-white text-sm focus:outline-none focus:border-[#00FFA7]"
                  placeholder="What this system does" />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#D0D5DD] mb-1">URL</label>
                <input type="text" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0C111D] border border-[#344054] text-white text-sm focus:outline-none focus:border-[#00FFA7]"
                  placeholder="http://localhost:3000" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#D0D5DD] mb-1">Docker Container</label>
                  <input type="text" value={form.container} onChange={(e) => setForm({ ...form, container: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0C111D] border border-[#344054] text-white text-sm focus:outline-none focus:border-[#00FFA7]"
                    placeholder="my-container" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#D0D5DD] mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0C111D] border border-[#344054] text-white text-sm focus:outline-none focus:border-[#00FFA7]">
                    <option value="docker">Docker</option>
                    <option value="external">External URL</option>
                    <option value="iframe">Embedded (iframe)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg text-[#D0D5DD] text-sm hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="px-4 py-2 rounded-lg bg-[#00FFA7] text-[#0C111D] font-semibold text-sm hover:bg-[#00FFA7]/90 transition-colors disabled:opacity-50">
                {submitting ? 'Saving...' : editingId ? 'Save' : 'Add System'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
