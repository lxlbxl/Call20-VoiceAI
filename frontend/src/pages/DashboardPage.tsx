import { useState, useEffect } from 'react'
import { callsApi, paymentsApi, agentsApi } from '@/lib/api'
import { toast } from 'sonner'
import {
    Phone,
    Users,
    Wallet,
    Clock,
    TrendingUp,
} from 'lucide-react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'

export default function DashboardPage() {
    const [totalCalls, setTotalCalls] = useState(0)
    const [activeAgents, setActiveAgents] = useState(0)
    const [walletBalance, setWalletBalance] = useState(0)
    const [avgDuration, setAvgDuration] = useState(0)
    const [chartData, setChartData] = useState<Array<{ day: string; count: number }>>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            callsApi.analytics({}),
            paymentsApi.wallet(),
            agentsApi.get(),
        ])
            .then(([callsRes, walletRes, agentsRes]) => {
                const callsData = callsRes.data
                setTotalCalls(callsData.total_calls || 0)
                setAvgDuration(callsData.avg_duration_seconds || 0)
                setWalletBalance(walletRes.data.balance || 0)
                setActiveAgents(agentsRes.data.length || 0)
                setChartData(callsData.calls_by_day || [])
            })
            .catch(() => toast.error('Failed to load dashboard data'))
            .finally(() => setLoading(false))
    }, [])

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}m ${s}s`
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64">Loading...</div>
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-gray-500 mt-1">Overview of your AI voice agent platform</p>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Calls</p>
                            <p className="text-3xl font-bold mt-1">{totalCalls}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Phone className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="card p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Active Agents</p>
                            <p className="text-3xl font-bold mt-1">{activeAgents}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>
                <div className="card p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Wallet Balance</p>
                            <p className="text-3xl font-bold mt-1">${walletBalance.toFixed(2)}</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <Wallet className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                </div>
                <div className="card p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Avg Duration</p>
                            <p className="text-3xl font-bold mt-1">{formatDuration(avgDuration)}</p>
                        </div>
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-amber-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="card p-6">
                <h2 className="text-lg font-semibold mb-4">Calls Over Time</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}