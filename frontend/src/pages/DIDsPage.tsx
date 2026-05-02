import { useState, useEffect, FormEvent } from 'react'
import { didsApi } from '@/lib/api'
import { toast } from 'sonner'
import { Phone, Plus, Trash2, Loader2 } from 'lucide-react'

interface DID {
    id: string
    phone_number: string
    country_code: string
    number_type?: string
    status: string
    created_at: string
}

const COUNTRIES = [
    { value: 'US', label: 'United States', flag: '🇺🇸' },
    { value: 'GB', label: 'United Kingdom', flag: '🇬🇧' },
    { value: 'NG', label: 'Nigeria', flag: '🇳🇬' },
    { value: 'KE', label: 'Kenya', flag: '🇰🇪' },
    { value: 'GH', label: 'Ghana', flag: '🇬🇭' },
    { value: 'ZA', label: 'South Africa', flag: '🇿🇦' },
    { value: 'CA', label: 'Canada', flag: '🇨🇦' },
    { value: 'AU', label: 'Australia', flag: '🇦🇺' },
]

const NUMBER_TYPES = [
    { value: 'local', label: 'Local' },
    { value: 'toll_free', label: 'Toll-Free' },
    { value: 'mobile', label: 'Mobile' },
]

export default function DIDsPage() {
    const [dids, setDids] = useState<DID[]>([])
    const [loading, setLoading] = useState(true)
    const [provisioning, setProvisioning] = useState(false)
    const [countryCode, setCountryCode] = useState('US')
    const [numberType, setNumberType] = useState('local')

    const fetchDids = () => {
        didsApi.list()
            .then((res) => setDids(res.data))
            .catch(() => toast.error('Failed to load phone numbers'))
            .finally(() => setLoading(false))
    }

    useEffect(() => { fetchDids() }, [])

    const handleProvision = async (e: FormEvent) => {
        e.preventDefault()
        setProvisioning(true)
        try {
            await didsApi.provision({ country_code: countryCode, number_type: numberType })
            toast.success('Phone number provisioned successfully')
            fetchDids()
        } catch {
            toast.error('Failed to provision number')
        } finally {
            setProvisioning(false)
        }
    }

    const handleRelease = async (id: string) => {
        if (!confirm('Are you sure you want to release this number?')) return
        try {
            await didsApi.release(id)
            toast.success('Number released')
            fetchDids()
        } catch {
            toast.error('Failed to release number')
        }
    }

    if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Phone Numbers</h1>
                <p className="text-gray-500 mt-1">Manage your DID phone numbers</p>
            </div>

            {/* Provision Form */}
            <div className="card p-6">
                <h2 className="text-lg font-semibold mb-4">Provision New Number</h2>
                <form onSubmit={handleProvision} className="flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium mb-1">Country</label>
                        <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            className="input"
                        >
                            {COUNTRIES.map((c) => (
                                <option key={c.value} value={c.value}>{c.flag} {c.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Type</label>
                        <select
                            value={numberType}
                            onChange={(e) => setNumberType(e.target.value)}
                            className="input"
                        >
                            {NUMBER_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={provisioning}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50"
                    >
                        {provisioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Provision
                    </button>
                </form>
            </div>

            {/* DID List */}
            <div className="card">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left p-4 font-medium">Phone Number</th>
                                <th className="text-left p-4 font-medium">Country</th>
                                <th className="text-left p-4 font-medium">Type</th>
                                <th className="text-left p-4 font-medium">Status</th>
                                <th className="text-right p-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dids.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        No phone numbers. Provision your first number above.
                                    </td>
                                </tr>
                            ) : (
                                dids.map((did) => (
                                    <tr key={did.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 font-medium">
                                                <Phone className="w-4 h-4 text-gray-400" />
                                                {did.phone_number}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {COUNTRIES.find((c) => c.value === did.country_code)?.label || did.country_code}
                                        </td>
                                        <td className="p-4">
                                            <span className="badge badge-info">{did.number_type || 'local'}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`badge ${did.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                                {did.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleRelease(did.id)}
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
        </div>
    )
}