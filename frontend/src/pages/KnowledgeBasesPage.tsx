import { useState, useEffect, FormEvent } from 'react'
import { kbApi } from '@/client/api'
import { toast } from 'sonner'
import { Database, Plus, Trash2, Loader2, FileText, Globe, ClipboardList } from 'lucide-react'

interface KB {
    id: string
    name: string
    source_type: string
    source_url?: string
    status: string
    chunk_count?: number
    created_at: string
}

const SOURCE_TYPES = [
    { value: 'text', label: 'Text', icon: FileText },
    { value: 'url', label: 'URL', icon: Globe },
    { value: 'file', label: 'File', icon: ClipboardList },
]

export default function KnowledgeBasesPage() {
    const [kbs, setKbs] = useState<KB[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [name, setName] = useState('')
    const [sourceType, setSourceType] = useState('text')
    const [sourceUrl, setSourceUrl] = useState('')
    const [content, setContent] = useState('')

    const fetchKbs = () => {
        kbApi.list()
            .then((res) => setKbs(res.data))
            .catch(() => toast.error('Failed to load knowledge bases'))
            .finally(() => setLoading(false))
    }

    useEffect(() => { fetchKbs() }, [])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!name) { toast.error('Name is required'); return }
        setSaving(true)
        try {
            await kbApi.create({
                name,
                source_type: sourceType,
                source_url: sourceType === 'url' ? sourceUrl : undefined,
                content: sourceType === 'text' ? content : undefined,
            })
            toast.success('Knowledge base created')
            setShowForm(false)
            fetchKbs()
        } catch {
            toast.error('Failed to create knowledge base')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this knowledge base?')) return
        try {
            await kbApi.delete(id)
            toast.success('Deleted')
            fetchKbs()
        } catch {
            toast.error('Failed to delete')
        }
    }

    if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Knowledge Bases</h1>
                    <p className="text-gray-500 mt-1">Upload documents and content for your AI agents</p>
                </div>
                <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    New KB
                </button>
            </div>

            <div className="card">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left p-4 font-medium">Name</th>
                                <th className="text-left p-4 font-medium">Source</th>
                                <th className="text-left p-4 font-medium">Status</th>
                                <th className="text-left p-4 font-medium">Chunks</th>
                                <th className="text-right p-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {kbs.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No knowledge bases yet.</td></tr>
                            ) : (
                                kbs.map((kb) => (
                                    <tr key={kb.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4 font-medium">{kb.name}</td>
                                        <td className="p-4">
                                            <span className="flex items-center gap-1 text-sm">
                                                {(() => {
                                                    const sourceType = SOURCE_TYPES.find((s) => s.value === kb.source_type);
                                                    const IconComponent = sourceType?.icon;
                                                    return IconComponent ? <IconComponent className="w-3.5 h-3.5" /> : null;
                                                })()}
                                                {kb.source_type}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`badge ${kb.status === 'ready' ? 'badge-success' : kb.status === 'processing' ? 'badge-warning' : 'badge-danger'}`}>
                                                {kb.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm">{kb.chunk_count || '-'}</td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleDelete(kb.id)} className="p-2 hover:bg-red-50 rounded-md text-red-600">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
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
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                        <div className="p-6 border-b"><h2 className="text-xl font-bold">Create Knowledge Base</h2></div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Name *</label>
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input w-full" placeholder="Product FAQ" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Source Type</label>
                                <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="input w-full">
                                    {SOURCE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>
                            {sourceType === 'url' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">URL</label>
                                    <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className="input w-full" placeholder="https://example.com/docs" />
                                </div>
                            )}
                            {sourceType === 'text' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Content</label>
                                    <textarea value={content} onChange={(e) => setContent(e.target.value)} className="input w-full min-h-[120px]" placeholder="Paste your content here..." />
                                </div>
                            )}
                            <div className="flex gap-3 justify-end">
                                <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
