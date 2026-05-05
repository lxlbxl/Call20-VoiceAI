import { useState, useEffect, FormEvent } from 'react'
import { smsApi } from '@/client/api'
import { toast } from 'sonner'
import { MessageSquare, Send, Phone, Clock, Loader2 } from 'lucide-react'

interface SMSMessage {
    id: string
    to: string
    message: string
    status: string
    created_at: string
}

const STATUS_COLORS: Record<string, string> = {
    sent: 'badge-success',
    delivered: 'badge-success',
    failed: 'badge-danger',
    pending: 'badge-warning',
}

export default function SMSPage() {
    const [messages, setMessages] = useState<SMSMessage[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [to, setTo] = useState('')
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)

    const fetchMessages = () => {
        smsApi.list()
            .then((res) => setMessages(res.data))
            .catch(() => toast.error('Failed to load messages'))
            .finally(() => setLoading(false))
    }

    useEffect(() => { fetchMessages() }, [])

    const handleSend = async (e: FormEvent) => {
        e.preventDefault()
        if (!to || !message) { toast.error('All fields required'); return }
        setSending(true)
        try {
            await smsApi.send({ to, message })
            toast.success('Message sent')
            setShowForm(false)
            fetchMessages()
        } catch {
            toast.error('Failed to send message')
        } finally {
            setSending(false)
        }
    }

    if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">SMS Messages</h1>
                    <p className="text-gray-500 mt-1">Send and manage SMS messages</p>
                </div>
                <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Send Message
                </button>
            </div>

            <div className="card">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left p-4 font-medium">To</th>
                                <th className="text-left p-4 font-medium">Message</th>
                                <th className="text-left p-4 font-medium">Status</th>
                                <th className="text-left p-4 font-medium">Sent At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {messages.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-500">No messages yet.</td></tr>
                            ) : (
                                messages.map((msg) => (
                                    <tr key={msg.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-gray-400" />
                                                <span className="font-medium">{msg.to}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm max-w-xs truncate">{msg.message}</td>
                                        <td className="p-4">
                                            <span className={`badge ${STATUS_COLORS[msg.status] || 'badge-info'}`}>
                                                {msg.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">
                                            {new Date(msg.created_at).toLocaleString()}
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
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="p-6 border-b"><h2 className="text-xl font-bold">Send SMS</h2></div>
                        <form onSubmit={handleSend} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Phone Number *</label>
                                <input type="tel" value={to} onChange={(e) => setTo(e.target.value)} className="input w-full" placeholder="+1234567890" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Message *</label>
                                <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="input w-full min-h-[100px]" placeholder="Your message..." required />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Cancel</button>
                                <button type="submit" disabled={sending} className="btn-primary disabled:opacity-50">
                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    {sending ? 'Sending...' : 'Send'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
