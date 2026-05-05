import { useState, useEffect, FormEvent } from 'react'
import { webhooksApi } from '@/client/api'
import { toast } from 'sonner'
import { Webhook, Plus, Trash2, Edit2, Loader2, Power, Play } from 'lucide-react'

interface Webhook {
    id: string
    url: string
    events: string[]
    status: string
    created_at: string
}

const ALL_EVENTS = [
    'call.started', 'call.ended', 'call.failed',
    'sms.sent', 'sms.delivered', 'sms.failed',
    'agent.created', 'agent.updated', 'agent.deleted',
    'payment.completed', 'payment.failed',
    'kb.ready', 'kb.failed',
]

export default function WebhooksPage() {
    const [webhooks, setWebhooks] = useState<Webhook[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    const [url, setUrl] = useState('')
    const [selectedEvents, setSelectedEvents] = useState<string[]>([])
    const [secret, setSecret] = useState('')

    const fetchWebhooks = () => {
        webhooksApi.list()
            .then((res) => setWebhooks(res.data))
            .catch(() => toast.error('Failed to load webhooks'))
            .finally(() => setLoading(false))
    }

    useEffect(() => { fetchWebhooks() }, [])

    const openCreate = () => {
        setUrl('')
        setSelectedEvents([])
        setSecret('')
        setEditingId(null)
        setShowForm(true)
    }

    const openEdit = (wh: Webhook) => {
        setUrl(wh.url)
        setSelectedEvents(wh.events)
        setSecret('')
        setEditingId(wh.id)
        setShowForm(true)
    }

    const toggleEvent = (event: string) => {
        setSelectedEvents((prev) =>
            prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
        )
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!url) { toast.error('URL is required'); return }
        setSaving(true)
        try {
            if (editingId) {
                await webhooksApi.update(editingId, { url, events: selectedEvents, secret: secret || undefined })
                toast.success('Webhook updated')
            } else {
                await webhooksApi.create({ url, events: selectedEvents, secret: secret || undefined })
                toast.success('Webhook created')
            }
            setShowForm(false)
            fetchWebhooks()
        } catch {
            toast.error('Failed to save webhook')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this webhook?')) return
        try {
            await webhooksApi.delete(id)
            toast.success('Deleted')
            fetchWebhooks()
        } catch {
            toast.error('Failed to delete')
        }
    }

    const handleTest = async (id: string) => {
        try {
            await webhooksApi.test(id)
            toast.success('Test webhook sent')
        } catch {
            toast.error('Test failed')
        }
    }

    if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Webhooks</h1>
                    <p className="text-gray-500 mt-1">Configure webhook endpoints for event notifications</p>
                </div>
                <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    New Webhook
                </button>
            </div>

            <div className="card">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left p-4 font-medium">URL</th>
                                <th className="text-left p-4 font-medium">Events</th>
                                <th className="text-left p-4 font-medium">Status</th>
                                <th className="text-right p-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {webhooks.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-500">No webhooks configured.</td></tr>
                            ) : (
                                webhooks.map((wh) => (
                                    <tr key={wh.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4 font-mono text-sm">{wh.url}</td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-1">
                                                {wh.events.slice(0, 3).map((ev) => (
                                                    <span key={ev} className="badge badge-info">{ev}</span>
                                                ))}
                                                {wh.events.length > 3 && (
                                                    <span className="badge badge-gray">+{wh.events.length - 3}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`badge ${wh.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                                {wh.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleTest(wh.id)} className="p-2 hover:bg-blue-50 rounded-md text-blue-600" title="Test">
                                                    <Play className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => openEdit(wh)} className="p-2 hover:bg-gray-100 rounded-md">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(wh.id)} className="p-2 hover:bg-red-50 rounded-md text-red-600">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold">{editingId ? 'Edit Webhook' : 'Create Webhook'}</h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Endpoint URL *</label>
                                <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className="input w-full" placeholder="https://your-server.com/webhook" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Events</label>
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                                    {ALL_EVENTS.map((ev) => (
                                        <label key={ev} className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedEvents.includes(ev)}
                                                onChange={() => toggleEvent(ev)}
                                                className="rounded"
                                            />
                                            {ev}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Secret (optional)</label>
                                <input type="text" value={secret} onChange={(e) => setSecret(e.target.value)} className="input w-full" placeholder="HMAC secret key" />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
