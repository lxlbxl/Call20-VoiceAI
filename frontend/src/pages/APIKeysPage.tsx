import { useState, useEffect, FormEvent } from 'react'
import { apiKeysApi } from '@/client/api'
import { toast } from 'sonner'
import { Key, Plus, Trash2, Loader2, Eye, EyeOff, Copy, Check } from 'lucide-react'

interface APIKey {
    id: string
    name: string
    key?: string
    masked_key: string
    created_at: string
}

export default function APIKeysPage() {
    const [apiKeys, setApiKeys] = useState<APIKey[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [name, setName] = useState('')
    const [newlyCreated, setNewlyCreated] = useState<APIKey | null>(null)
    const [revealed, setRevealed] = useState<Set<string>>(new Set())
    const [copied, setCopied] = useState(false)

    const fetchKeys = () => {
        apiKeysApi.list()
            .then((res) => setApiKeys(res.data))
            .catch(() => toast.error('Failed to load API keys'))
            .finally(() => setLoading(false))
    }

    useEffect(() => { fetchKeys() }, [])

    const handleCreate = async (e: FormEvent) => {
        e.preventDefault()
        if (!name) { toast.error('Name is required'); return }
        setSaving(true)
        try {
            const res = await apiKeysApi.create({ name })
            setNewlyCreated(res.data)
            setShowForm(false)
            fetchKeys()
            toast.success('API key created')
        } catch {
            toast.error('Failed to create API key')
        } finally {
            setSaving(false)
        }
    }

    const handleRevoke = async (id: string) => {
        if (!confirm('Revoke this API key? This cannot be undone.')) return
        try {
            await apiKeysApi.revoke(id)
            toast.success('API key revoked')
            fetchKeys()
        } catch {
            toast.error('Failed to revoke')
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">API Keys</h1>
                    <p className="text-gray-500 mt-1">Manage your API authentication keys</p>
                </div>
                <button onClick={() => { setShowForm(true); setName('') }} className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    New Key
                </button>
            </div>

            {/* Newly Created Key Banner */}
            {newlyCreated && newlyCreated.key && (
                <div className="card p-6 border-amber-200 bg-amber-50">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Key className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-amber-800">New API Key Created</h3>
                            <p className="text-sm text-amber-700 mt-1">Copy this key now — it won't be shown again.</p>
                            <div className="flex items-center gap-2 mt-3">
                                <code className="flex-1 bg-white border rounded-md px-3 py-2 text-sm font-mono">
                                    {newlyCreated.key}
                                </code>
                                <button
                                    onClick={() => copyToClipboard(newlyCreated!.key!)}
                                    className="p-2 hover:bg-white rounded-md"
                                >
                                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="card">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left p-4 font-medium">Name</th>
                                <th className="text-left p-4 font-medium">Key</th>
                                <th className="text-left p-4 font-medium">Created</th>
                                <th className="text-right p-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {apiKeys.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-500">No API keys yet.</td></tr>
                            ) : (
                                apiKeys.map((ak) => (
                                    <tr key={ak.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 font-medium">
                                                <Key className="w-4 h-4 text-gray-400" />
                                                {ak.name}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <code className="text-sm bg-gray-100 rounded px-2 py-1 font-mono">
                                                    {revealed.has(ak.id) ? ak.masked_key : ak.masked_key}
                                                </code>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">
                                            {new Date(ak.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleRevoke(ak.id)}
                                                className="p-2 hover:bg-red-50 rounded-md text-red-600"
                                            >
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
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                        <h2 className="text-xl font-bold mb-4">Create API Key</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Name *</label>
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input w-full" placeholder="Production Key" required />
                            </div>
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
