import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { callsApi } from '@/lib/api'
import { toast } from 'sonner'
import {
    ArrowLeft, Phone, Clock, User, Headphones,
    CheckCircle, XCircle, AlertCircle, MessageSquare,
} from 'lucide-react'

interface CallDetails {
    id: string
    caller_number: string
    agent_name?: string
    duration_seconds: number
    status: string
    created_at: string
    direction?: string
}

interface TranscriptMessage {
    role: string
    content: string
    timestamp?: string
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; className: string }> = {
    completed: { label: 'Completed', icon: CheckCircle, className: 'badge-success' },
    failed: { label: 'Failed', icon: XCircle, className: 'badge-danger' },
    in_progress: { label: 'In Progress', icon: AlertCircle, className: 'badge-info' },
}

export default function CallDetailPage() {
    const { callId } = useParams<{ callId: string }>()
    const navigate = useNavigate()
    const [call, setCall] = useState<CallDetails | null>(null)
    const [transcript, setTranscript] = useState<TranscriptMessage[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!callId) return
        Promise.all([
            callsApi.get(callId),
            callsApi.transcript(callId),
        ])
            .then(([callRes, transcriptRes]) => {
                setCall(callRes.data)
                setTranscript(transcriptRes.data || [])
            })
            .catch(() => toast.error('Failed to load call details'))
            .finally(() => setLoading(false))
    }, [callId])

    if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>
    if (!call) return <div className="flex items-center justify-center h-64">Call not found</div>

    const statusConfig = STATUS_CONFIG[call.status] || STATUS_CONFIG.failed

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/calls')} className="p-2 hover:bg-gray-100 rounded-md">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold">Call Details</h1>
                    <p className="text-gray-500 mt-1">{call.id}</p>
                </div>
            </div>

            {/* Call Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Caller</p>
                            <p className="font-medium">{call.caller_number}</p>
                        </div>
                    </div>
                </div>
                <div className="card p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Headphones className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Agent</p>
                            <p className="font-medium">{call.agent_name || '-'}</p>
                        </div>
                    </div>
                </div>
                <div className="card p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Duration</p>
                            <p className="font-medium">{Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s</p>
                        </div>
                    </div>
                </div>
                <div className="card p-6">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${call.status === 'completed' ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                            <statusConfig.icon className={`w-5 h-5 ${call.status === 'completed' ? 'text-green-600' : 'text-red-600'
                                }`} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Status</p>
                            <p className="font-medium">{statusConfig.label}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transcript */}
            <div className="card p-6">
                <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5" />
                    <h2 className="text-lg font-semibold">Transcript</h2>
                </div>
                {transcript.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No transcript available</p>
                ) : (
                    <div className="space-y-4">
                        {transcript.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[70%] rounded-lg px-4 py-2 ${msg.role === 'user'
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}
                                >
                                    <p className="text-sm font-medium mb-1">
                                        {msg.role === 'user' ? 'Caller' : 'Agent'}
                                    </p>
                                    <p className="text-sm">{msg.content}</p>
                                    {msg.timestamp && (
                                        <p className="text-xs mt-1 opacity-60">{msg.timestamp}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}