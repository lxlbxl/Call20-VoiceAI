import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { callsApi } from '@/client/api'
import { toast } from 'sonner'
import { Phone, Clock, User, Headphones, Filter } from 'lucide-react'

interface Call {
    id: string
    caller_number: string
    agent_name?: string
    duration_seconds: number
    status: string
    created_at: string
}

const STATUS_COLORS: Record<string, string> = {
    completed: 'badge-success',
    failed: 'badge-danger',
    in_progress: 'badge-info',
    queued: 'badge-warning',
}

export default function CallsPage() {
    const [calls, setCalls] = useState<Call[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')

    const fetchCalls = () => {
        callsApi.list(statusFilter !== 'all' ? { status: statusFilter } : {})
            .then((res) => setCalls(res.data))
            .catch(() => toast.error('Failed to load calls'))
            .finally(() => setLoading(false))
    }

    useEffect(() => { fetchCalls() }, [statusFilter])

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}m ${s}s`
    }

    if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Calls</h1>
                <p className="text-gray-500 mt-1">View and manage all call activity</p>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                {['all', 'completed', 'failed', 'in_progress', 'queued'].map((s) => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${statusFilter === s
                                ? 'bg-primary text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {s === 'all' ? 'All' : s.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Calls Table */}
            <div className="card">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left p-4 font-medium">Caller</th>
                                <th className="text-left p-4 font-medium">Agent</th>
                                <th className="text-left p-4 font-medium">Duration</th>
                                <th className="text-left p-4 font-medium">Status</th>
                                <th className="text-left p-4 font-medium">Time</th>
                                <th className="text-right p-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {calls.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No calls found.</td></tr>
                            ) : (
                                calls.map((call) => (
                                    <tr key={call.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-gray-400" />
                                                <span className="font-medium">{call.caller_number}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1 text-sm">
                                                <Headphones className="w-3.5 h-3.5" />
                                                {call.agent_name || '-'}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1 text-sm">
                                                <Clock className="w-3.5 h-3.5" />
                                                {formatDuration(call.duration_seconds)}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`badge ${STATUS_COLORS[call.status] || 'badge-info'}`}>
                                                {call.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">
                                            {new Date(call.created_at).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <Link
                                                to={`/calls/${call.id}`}
                                                className="text-primary hover:underline text-sm font-medium"
                                            >
                                                View Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
