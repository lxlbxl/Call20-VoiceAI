"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PhoneCall, Bot, CreditCard, Phone, Plus, ArrowRight } from "lucide-react"
import { StatsCard } from "@/components/ui/stats-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatRelativeTime, formatDuration } from "@/lib/utils"
import Link from "next/link"

interface Call {
  id: string
  caller: string
  called: string
  duration: number
  status: "completed" | "missed" | "failed"
  sentiment?: "positive" | "neutral" | "negative"
  disposition?: string
  recording_url?: string
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState({
    callsToday: 0,
    activeAgents: 0,
    creditBalance: 0,
    connectedDIDs: 0,
  })
  const [recentCalls, setRecentCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.push("/login")
      return
    }
    setIsAuthenticated(true)

    const fetchData = async () => {
      try {
        const apiClient = (await import("@/lib/api")).apiClient

        const [callsRes, agentsRes, walletRes, didsRes] = await Promise.all([
          apiClient.get("/calls/", { params: { limit: 10 } }),
          apiClient.get("/agents/"),
          apiClient.get("/wallet/balance"),
          apiClient.get("/dids/"),
        ])

        setStats({
          callsToday: callsRes.data.calls?.length || 0,
          activeAgents: agentsRes.data.filter((a: any) => a.status === "active").length || 0,
          creditBalance: walletRes.data.balance || 0,
          connectedDIDs: didsRes.data.filter((d: any) => d.status === "active").length || 0,
        })
        setRecentCalls(callsRes.data.calls || [])
      } catch (error: any) {
        console.error("Failed to fetch dashboard data:", error)
        if (error.response?.status === 401) {
          localStorage.removeItem("access_token")
          router.push("/login")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--muted-foreground)]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Welcome back — here&apos;s what&apos;s happening with your voice agents.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/agents/new">
              <Plus className="size-4" />
              New Agent
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dids/new">
              <Phone className="size-4" />
              Add DID
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Calls Today"
          value={stats.callsToday}
          icon={PhoneCall}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Active Agents"
          value={stats.activeAgents}
          icon={Bot}
          description="Voice agents running"
        />
        <StatsCard
          title="Credit Balance"
          value={`$${stats.creditBalance.toFixed(2)}`}
          icon={CreditCard}
          description="Available credits"
        />
        <StatsCard
          title="Connected DIDs"
          value={stats.connectedDIDs}
          icon={Phone}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/agents/new" className="group">
          <Card className="hover:border-[var(--primary)] transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex size-12 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                <Bot className="size-6 text-[var(--primary)]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Create New Agent</h3>
                <p className="text-sm text-[var(--muted-foreground)]">Build a voice agent in minutes</p>
              </div>
              <ArrowRight className="size-5 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/knowledge-bases/new" className="group">
          <Card className="hover:border-[var(--primary)] transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex size-12 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                <svg className="size-6 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Add Knowledge Base</h3>
                <p className="text-sm text-[var(--muted-foreground)]">Train your agent with your data</p>
              </div>
              <ArrowRight className="size-5 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/billing" className="group">
          <Card className="hover:border-[var(--primary)] transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex size-12 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                <CreditCard className="size-6 text-[var(--primary)]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Buy Credits</h3>
                <p className="text-sm text-[var(--muted-foreground)]">Top up your voice agent credits</p>
              </div>
              <ArrowRight className="size-5 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Calls</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/calls">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-[var(--muted)] animate-shimmer" />
              ))}
            </div>
          ) : recentCalls.length === 0 ? (
            <div className="text-center py-12">
              <PhoneCall className="size-12 mx-auto text-[var(--muted-foreground)] mb-4" />
              <h3 className="font-semibold mb-2">No calls yet</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Your voice agents haven&apos;t received any calls yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCalls.map((call, idx) => (
                <div
                  key={call.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors animate-fade-in"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-[var(--primary)]/10">
                    <PhoneCall className="size-5 text-[var(--primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{call.caller || "Unknown Caller"}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Called {formatRelativeTime(call.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        call.status === "completed" ? "success" :
                        call.status === "missed" ? "warning" : "destructive"
                      }
                    >
                      {call.status}
                    </Badge>
                    <span className="text-sm text-[var(--muted-foreground)] tabular-nums">
                      {formatDuration(call.duration)}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/calls/${call.id}`}>
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}