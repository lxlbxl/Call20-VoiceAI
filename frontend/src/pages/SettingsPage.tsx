import { useState, useEffect, FormEvent } from 'react'
import { tenantsApi } from '@/client/api'
import { toast } from 'sonner'
import { Building2, Mail, Phone, Clock, Save, Loader2, AlertCircle } from 'lucide-react'

interface TenantSettings {
    name: string
    email: string
    phone_number: string
    timezone: string
    status: string
}

const TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Toronto',
    'America/Vancouver',
    'America/Mexico_City',
    'America/Sao_Paulo',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Moscow',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Shanghai',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Australia/Sydney',
    'Pacific/Auckland',
]

export default function SettingsPage() {
    const [settings, setSettings] = useState<TenantSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({ name: '', email: '', phone_number: '', timezone: 'UTC' })

    useEffect(() => {
        tenantsApi.get()
            .then((res) => {
                setSettings(res.data)
                setForm({
                    name: res.data.name || '',
                    email: res.data.email || '',
                    phone_number: res.data.phone_number || '',
                    timezone: res.data.timezone || 'UTC',
                })
            })
            .catch(() => toast.error('Failed to load settings'))
            .finally(() => setLoading(false))
    }, [])

    const handleSave = async (e: FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            await tenantsApi.update(form)
            toast.success('Settings saved')
        } catch {
            toast.error('Failed to save settings')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-gray-500 mt-1">Manage your account settings</p>
            </div>

            <div className="card p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">Company Information</h2>
                        <span className={`badge ${settings?.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                            {settings?.status || 'active'}
                        </span>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Company Name</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input w-full pl-9" placeholder="Your Company" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input w-full pl-9" placeholder="admin@company.com" required />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Contact support to change your email address</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Phone Number</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="tel" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} className="input w-full pl-9" placeholder="+1234567890" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Timezone</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className="input w-full pl-9">
                                {TIMEZONES.map((tz) => (
                                    <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50 flex items-center gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
