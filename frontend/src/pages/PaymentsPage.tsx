import { useState, useEffect, FormEvent } from 'react'
import { paymentsApi } from '@/client/api'
import { toast } from 'sonner'
import {
    Wallet, CreditCard, Gift, ArrowUpRight, ArrowDownLeft,
    Loader2, DollarSign, Sparkles, CheckCircle2, XCircle,
} from 'lucide-react'

interface WalletData {
    balance: number
    currency: string
}

interface Transaction {
    id: string
    type: 'topup' | 'redemption' | 'charge'
    amount: number
    currency: string
    status: 'completed' | 'pending' | 'failed'
    description: string
    created_at: string
}

export default function PaymentsPage() {
    const [wallet, setWallet] = useState<WalletData | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [topupAmount, setTopupAmount] = useState('')
    const [topupLoading, setTopupLoading] = useState(false)
    const [couponCode, setCouponCode] = useState('')
    const [couponLoading, setCouponLoading] = useState(false)
    const [couponResult, setCouponResult] = useState<{ success: boolean; message: string } | null>(null)

    const fetchData = () => {
        Promise.all([
            paymentsApi.wallet(),
            paymentsApi.transactions(),
        ])
            .then(([walletRes, txRes]) => {
                setWallet(walletRes.data)
                setTransactions(txRes.data || [])
            })
            .catch(() => toast.error('Failed to load payment data'))
            .finally(() => setLoading(false))
    }

    useEffect(() => { fetchData() }, [])

    const handleTopup = async (e: FormEvent) => {
        e.preventDefault()
        const amount = parseFloat(topupAmount)
        if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return }
        setTopupLoading(true)
        try {
            const res = await paymentsApi.topup({ amount, provider: 'stripe' })
            if (res.data?.checkout_url) {
                window.location.href = res.data.checkout_url
            } else {
                toast.success('Top-up initiated')
                fetchData()
            }
        } catch {
            toast.error('Failed to process top-up')
        } finally {
            setTopupLoading(false)
        }
    }

    const handleRedeem = async (e: FormEvent) => {
        e.preventDefault()
        if (!couponCode.trim()) { toast.error('Enter a coupon code'); return }
        setCouponLoading(true)
        setCouponResult(null)
        try {
            const res = await paymentsApi.redeemCoupon({ code: couponCode.trim().toUpperCase() })
            setCouponResult({ success: true, message: res.data?.message || 'Coupon redeemed successfully!' })
            fetchData()
        } catch (err: any) {
            setCouponResult({ success: false, message: err.response?.data?.detail || 'Invalid coupon code' })
        } finally {
            setCouponLoading(false)
        }
    }

    if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>

    const typeIcons: Record<string, any> = { topup: ArrowDownLeft, redemption: Gift, charge: ArrowUpRight }
    const typeColors: Record<string, string> = { topup: 'text-green-600 bg-green-100', redemption: 'text-purple-600 bg-purple-100', charge: 'text-blue-600 bg-blue-100' }
    const statusColors: Record<string, string> = { completed: 'badge-success', pending: 'badge-warning', failed: 'badge-danger' }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Payments & Billing</h1>
                <p className="text-gray-500 mt-1">Manage your wallet, top-ups, and coupons</p>
            </div>

            {/* Wallet Balance */}
            <div className="card p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500">Wallet Balance</p>
                        <p className="text-3xl font-bold mt-1">
                            ${wallet?.balance.toFixed(2) || '0.00'}
                        </p>
                        <span className="badge badge-info mt-2 inline-block">{wallet?.currency || 'USD'}</span>
                    </div>
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <Wallet className="w-8 h-8 text-primary" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top-Up */}
                <div className="card p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <CreditCard className="w-5 h-5" />
                        <h2 className="text-lg font-semibold">Top Up</h2>
                    </div>
                    <form onSubmit={handleTopup} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Amount (USD)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type="number" step="0.01" min="1" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} className="input w-full pl-8" placeholder="50.00" required />
                            </div>
                        </div>
                        <button type="submit" disabled={topupLoading} className="btn-primary w-full disabled:opacity-50">
                            {topupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                            {topupLoading ? 'Processing...' : 'Top Up with Stripe'}
                        </button>
                    </form>
                </div>

                {/* Coupon Redemption */}
                <div className="card p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Gift className="w-5 h-5" />
                        <h2 className="text-lg font-semibold">Redeem Coupon</h2>
                    </div>
                    <form onSubmit={handleRedeem} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Coupon Code</label>
                            <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} className="input w-full font-mono" placeholder="CALL20-XXXX-XXXX" required />
                        </div>
                        <button type="submit" disabled={couponLoading} className="btn-primary w-full disabled:opacity-50">
                            {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {couponLoading ? 'Redeeming...' : 'Redeem'}
                        </button>
                        {couponResult && (
                            <div className={`flex items-center gap-2 p-3 rounded-md ${couponResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {couponResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                <p className="text-sm">{couponResult.message}</p>
                            </div>
                        )}
                    </form>
                </div>
            </div>

            {/* Transaction History */}
            <div className="card">
                <div className="p-6 border-b">
                    <h2 className="text-lg font-semibold">Transaction History</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left p-4 font-medium">Type</th>
                                <th className="text-left p-4 font-medium">Description</th>
                                <th className="text-left p-4 font-medium">Amount</th>
                                <th className="text-left p-4 font-medium">Status</th>
                                <th className="text-left p-4 font-medium">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No transactions yet.</td></tr>
                            ) : (
                                transactions.map((tx) => {
                                    const Icon = typeIcons[tx.type] || ArrowUpRight
                                    return (
                                        <tr key={tx.id} className="border-b hover:bg-gray-50">
                                            <td className="p-4">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeColors[tx.type] || 'text-gray-600 bg-gray-100'}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm">{tx.description}</td>
                                            <td className="p-4 font-medium">
                                                {tx.type === 'charge' ? '-' : '+'}${tx.amount.toFixed(2)}
                                            </td>
                                            <td className="p-4">
                                                <span className={`badge ${statusColors[tx.status] || 'badge-info'}`}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-gray-500">
                                                {new Date(tx.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
