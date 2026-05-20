"use client"

import { useState, useEffect, FormEvent } from "react"
import { api, Transaction, WalletBalance } from "@/lib/api"
import { toast } from "sonner"
import {
  Wallet,
  CreditCard,
  Gift,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  DollarSign,
  Sparkles,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { formatRelativeTime } from "@/lib/utils"

export default function BillingPage() {
  const [wallet, setWallet] = useState<WalletBalance | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [topupAmount, setTopupAmount] = useState("")
  const [topupLoading, setTopupLoading] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponResult, setCouponResult] = useState<{ success: boolean; message: string } | null>(null)

  const fetchData = async () => {
    try {
      const [walletRes, txRes] = await Promise.all([
        api.wallet.getBalance(),
        api.wallet.transactions(),
      ])
      setWallet(walletRes.data)
      setTransactions(txRes.data || [])
    } catch {
      toast.error("Failed to load payment data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleTopup = async (e: FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(topupAmount)
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount")
      return
    }
    setTopupLoading(true)
    try {
      const res = await api.wallet.topup({ amount, provider: "stripe" })
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url
      } else {
        toast.success("Wallet top-up initialized successfully")
        fetchData()
      }
    } catch {
      toast.error("Failed to process top-up")
    } finally {
      setTopupLoading(false)
    }
  }

  const handleRedeem = async (e: FormEvent) => {
    e.preventDefault()
    if (!couponCode.trim()) {
      toast.error("Enter a coupon code")
      return
    }
    setCouponLoading(true)
    setCouponResult(null)
    try {
      const res = await api.wallet.redeemCoupon({ code: couponCode.trim().toUpperCase() })
      setCouponResult({
        success: true,
        message: res.data?.message || "Coupon successfully redeemed into wallet credit!",
      })
      toast.success("Coupon code redeemed!")
      fetchData()
    } catch (err: any) {
      setCouponResult({
        success: false,
        message: err.response?.data?.detail || "Invalid or expired coupon code",
      })
    } finally {
      setCouponLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-fade-in">
        <div className="h-20 bg-[var(--muted)] rounded-lg animate-shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-48 bg-[var(--muted)] rounded-lg animate-shimmer" />
          <div className="h-48 bg-[var(--muted)] rounded-lg animate-shimmer" />
        </div>
        <div className="h-64 bg-[var(--muted)] rounded-lg animate-shimmer" />
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wallet & Billing</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Top up operational credits, redeem coupons, and audit voice agent resource costs.
          </p>
        </div>
      </div>

      {/* Wallet Balance Hero Card */}
      <Card className="border border-[var(--primary)]/20 bg-gradient-to-br from-[var(--primary)]/5 to-[var(--primary)]/10 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/10 rounded-full blur-2xl pointer-events-none" />
        <CardContent className="flex items-center justify-between p-6">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Available Wallet Credit</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-[var(--foreground)] tracking-tight">
                ${wallet?.balance.toFixed(2) || "0.00"}
              </span>
              <span className="text-xs font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-full uppercase">
                {wallet?.currency || "USD"}
              </span>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              This balance is consumed dynamically based on agent talk-time and SMS delivery rates.
            </p>
          </div>
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-lg shrink-0">
            <Wallet className="size-7" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Top Up Card */}
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="size-5 text-[var(--primary)]" />
              <CardTitle>Buy operational credits</CardTitle>
            </div>
            <CardDescription>Top up instantly with Stripe credit processing.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTopup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Top-Up Amount (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--muted-foreground)]" />
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    className="pl-8 bg-[var(--background)] font-semibold"
                    placeholder="50.00"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={topupLoading}
                className="w-full bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 font-semibold"
              >
                {topupLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Processing with Stripe...
                  </>
                ) : (
                  <>
                    <CreditCard className="size-4 mr-2" />
                    Purchase Credit
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Coupon Card */}
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gift className="size-5 text-[var(--primary)]" />
              <CardTitle>Redeem balance coupon</CardTitle>
            </div>
            <CardDescription>Redeem credit codes issued by reseller administration.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRedeem} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Voucher / Coupon Code</label>
                <Input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="bg-[var(--background)] font-mono text-center font-bold tracking-widest text-white uppercase placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                  placeholder="C20-XXXX-XXXX-XXXX"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={couponLoading}
                className="w-full bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 font-semibold"
              >
                {couponLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Applying voucher...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 mr-2" />
                    Apply to Balance
                  </>
                )}
              </Button>

              {couponResult && (
                <div
                  className={`flex items-start gap-2.5 p-3 rounded-lg border animate-fade-in ${
                    couponResult.success
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                  }`}
                >
                  {couponResult.success ? (
                    <CheckCircle className="size-4 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="size-4 shrink-0 mt-0.5" />
                  )}
                  <p className="text-xs font-semibold">{couponResult.message}</p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Transactions History */}
      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-md">
        <CardHeader>
          <CardTitle>Transactions Registry</CardTitle>
          <CardDescription>Comprehensive audit trail of wallet operations.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Clock className="size-12 mx-auto text-[var(--muted-foreground)] mb-4 animate-pulse-glow" />
              <h3 className="font-semibold text-lg mb-1">No transaction records</h3>
              <p className="text-sm text-[var(--muted-foreground)] max-w-sm mx-auto">
                No financial credits, charges, or coupon activities have been logged for this reseller tenant node.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30 text-[var(--muted-foreground)] font-medium">
                    <th className="text-left p-4">Operation</th>
                    <th className="text-left p-4">Description</th>
                    <th className="text-left p-4">Amount</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Created Time</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, idx) => {
                    const isDebit = tx.type === "charge"
                    return (
                      <tr
                        key={tx.id || idx}
                        className="border-b border-[var(--border)] hover:bg-[var(--muted)]/20 transition-colors animate-fade-in"
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {tx.type === "topup" ? (
                              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                                <ArrowDownLeft className="size-4" />
                              </div>
                            ) : tx.type === "redemption" ? (
                              <div className="flex size-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
                                <Gift className="size-4" />
                              </div>
                            ) : (
                              <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                                <ArrowUpRight className="size-4" />
                              </div>
                            )}
                            <span className="capitalize font-semibold text-xs text-[var(--foreground)]">
                              {tx.type === "topup" ? "Top Up" : tx.type === "redemption" ? "Voucher" : "Charge"}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-semibold text-[var(--foreground)] truncate max-w-xs">
                          {tx.description}
                        </td>
                        <td className={`p-4 font-mono font-bold text-sm ${isDebit ? "text-red-400" : "text-emerald-400"}`}>
                          {isDebit ? "-" : "+"}${tx.amount.toFixed(2)}
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={
                              tx.status === "completed" ? "success" :
                              tx.status === "pending" ? "warning" : "destructive"
                            }
                          >
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-xs text-[var(--muted-foreground)]">
                          {formatRelativeTime(tx.created_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
