import { useState, useEffect, FormEvent } from 'react'
import { agentsApi, kbApi } from '@/client/api'
import { toast } from 'sonner'
import { Headphones, Plus, Trash2, Edit2, Loader2, Globe, Mic, BookOpen } from 'lucide-react'

interface Agent {
    id: string
    name: string
    language: string
    voice: string
    system_prompt: string
    knowledge_base_id?: string
    status: string
    created_at: string
}

interface KB {
    id: string
    name: string
}

const LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'sw', label: 'Swahili' },
    { value: 'yo', label: 'Yoruba' },
    { value: 'ig', label: 'Igbo' },
    { value: 'ha', label: 'Hausa' },
    { value: 'am', label: 'Amharic' },
    { value: 'ar', label: 'Arabic' },
    { value: 'zh', label: 'Chinese' },
]

const VOICES = [
    { value: 'alloy', label: 'Alloy' },
    { value: 'echo', label: 'Echo' },
    { value: 'fable', label: 'Fable' },
    { value: 'onyx', label: 'Onyx' },
    { value: 'nova', label: 'Nova' },
    { value: 'shimmer', label: 'Shimmer' },
]

export default function AgentsPage() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [kbs, setKbs] = useState<KB[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // Form state
    const [name, setName] = useState('')
    const [language, setLanguage] = useState('en')
    const [voice, setVoice] = useState('alloy')
    const [systemPrompt, setSystemPrompt] = useState('')
    const [knowledgeBaseId, setKnowledgeBaseId] = useState('')
    const [saving, setSaving] = useState(false)

    const fetchAgents = () => {
        agentsApi.get()
            .then((res) => setAgents(res.data))
            .catch(() => toast.error('Failed to load agents'))
            .finally(() => setLoading(false))
    }

    const fetchKbs = () => {
        kbApi.list()
            .then((res) => setKbs(res.data))
            .catch(() => { })
    }

    useEffect(() => {
        fetchAgents()
        fetchKbs()
    }, [])

    const openCreate = () => {
        setName('')
        setLanguage('en')
        setVoice('alloy')
        setSystemPrompt('')
        setKnowledgeBaseId('')
        setEditingId(null)
        setShowForm(true)
    }

    const openEdit = (agent: Agent) => {
        setName(agent.name)
        setLanguage(agent.language)
        setVoice(agent.voice)
        setSystemPrompt(agent.system_prompt)
        setKnowledgeBaseId(agent.knowledge_base_id || '')
        setEditingId(agent.id)
        setShowForm(true)
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!name || !systemPrompt) {
            toast.error('Name and system prompt are required')
            return
        }
        setSaving(true)
        try {
            const data = {
                name,
                language,
                voice,
                system_prompt: systemPrompt,
                knowledge_base_id: knowledgeBaseId || undefined,
            }
            if (editingId) {
                await agentsApi.update(editingId, data)
                toast.success('Agent updated')
            } else {
                await agentsApi.create(data)
                toast.success('Agent created')
            }
            setShowForm(false)
            fetchAgents()
        } catch (err: unknown) {
            const error = err as { response?: { data?: { detail?: string } } }
            toast.error(error.response?.data?.detail || 'Failed to save agent')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this agent?')) return
        try {
            await agentsApi.delete(id)
            toast.success('Agent deleted')
            fetchAgents()
        } catch {
            toast.error('Failed to delete agent')
        }
        setDeletingId(null)
    }

    if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">AI Agents</h1>
                    <p className="text-gray-500 mt-1">Configure your AI voice agents</p>
                </div>
                <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    New Agent
                </button>
            </div>

            {/* Agent List */}
            <div className="card">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left p-4 font-medium">Name</th>
                                <th className="text-left p-4 font-medium">Language</th>
                                <th className="text-left p-4 font-medium">Voice</th>
                                <th className="text-left p-4 font-medium">Knowledge Base</th>
                                <th className="text-left p-4 font-medium">Status</th>
                                <th className="text-right p-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {agents.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        No agents yet. Create your first agent to get started.
                                    </td>
                                </tr>
                            ) : (
                                agents.map((agent) => (
                                    <tr key={agent.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <Headphones className="w-4 h-4 text-gray-400" />
                                                <span className="font-medium">{agent.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="flex items-center gap-1 text-sm">
                                                <Globe className="w-3.5 h-3.5" />
                                                {LANGUAGES.find((l) => l.value === agent.language)?.label || agent.language}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="flex items-center gap-1 text-sm">
                                                <Mic className="w-3.5 h-3.5" />
                                                {VOICES.find((v) => v.value === agent.voice)?.label || agent.voice}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {agent.knowledge_base_id ? (
                                                <span className="flex items-center gap-1 text-sm text-blue-600">
                                                    <BookOpen className="w-3.5 h-3.5" />
                                                    Attached
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-400">None</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`badge ${agent.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                                {agent.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEdit(agent)}
                                                    className="p-2 hover:bg-gray-100 rounded-md"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeletingId(agent.id)}
                                                    className="p-2 hover:bg-red-50 rounded-md text-red-600"
                                                >
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

            {/* Create/Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold">
                                {editingId ? 'Edit Agent' : 'Create Agent'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Agent Name *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input w-full"
                                    placeholder="Customer Support Agent"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Language</label>
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="input w-full"
                                    >
                                        {LANGUAGES.map((l) => (
                                            <option key={l.value} value={l.value}>{l.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Voice</label>
                                    <select
                                        value={voice}
                                        onChange={(e) => setVoice(e.target.value)}
                                        className="input w-full"
                                    >
                                        {VOICES.map((v) => (
                                            <option key={v.value} value={v.value}>{v.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Knowledge Base</label>
                                <select
                                    value={knowledgeBaseId}
                                    onChange={(e) => setKnowledgeBaseId(e.target.value)}
                                    className="input w-full"
                                >
                                    <option value="">None</option>
                                    {kbs.map((kb) => (
                                        <option key={kb.id} value={kb.id}>{kb.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">System Prompt *</label>
                                <textarea
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    className="input w-full min-h-[120px]"
                                    placeholder="You are a helpful customer support agent..."
                                    required
                                />
                            </div>
                            <div className="flex gap-3 justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="btn-outline"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-primary disabled:opacity-50"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : editingId ? (
                                        'Update Agent'
                                    ) : (
                                        'Create Agent'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deletingId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-bold mb-2">Delete Agent</h3>
                        <p className="text-gray-500 mb-6">
                            Are you sure you want to delete this agent? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeletingId(null)}
                                className="btn-outline"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deletingId)}
                                className="btn-destructive"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
