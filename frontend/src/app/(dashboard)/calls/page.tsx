"use client"

import { useEffect, useState } from "react"
import { PhoneCall, Play, Search, Filter, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { api, Call } from "@/lib/api"
import { formatRelativeTime, formatDuration } from "@/lib/utils"
import Link from "next/link"

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        const res = await api.calls.list({ limit: 50 })
        setCalls(res.data.calls || [])
      } catch (error) {
        console.error("Failed to fetch calls:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchCalls()
  }, [])

  const filteredCalls = calls.filter((call) => {
    const matchesSearch = call.caller?.includes(searchQuery) || call.called?.includes(searchQuery)
    const matchesStatus = statusFilter === "all" || call.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Call History</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Review and analyze all your voice agent interactions.
          </p>
        </div>
        <Button variant="outline">
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--muted-foreground)]" />
          <Input
            placeholder="Search by phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["all", "completed", "missed", "failed"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Calls Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-[var(--muted)] animate-shimmer" />
              ))}
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="text-center py-16">
              <PhoneCall className="size-12 mx-auto text-[var(--muted-foreground)] mb-4" />
              <h3 className="font-semibold mb-2">No calls found</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Your voice agents haven't received any calls yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                    <th className="text-left p-4 text-sm font-medium text-[var(--muted-foreground)]">Caller</th>
                    <th className="text-left p-4 text-sm font-medium text-[var(--muted-foreground)]">Direction</th>
                    <th className="text-left p-4 text-sm font-medium text-[var(--muted-foreground)]">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-[var(--muted-foreground)]">Duration</th>
                    <th className="text-left p-4 text-sm font-medium text-[var(--muted-foreground)]">Sentiment</th>
                    <th className="text-left p-4 text-sm font-medium text-[var(--muted-foreground)]">Time</th>
                    <th className="text-right p-4 text-sm font-medium text-[var(--muted-foreground)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCalls.map((call, idx) => (
                    <tr
                      key={call.id}
                      className="border-b border-[var(--border)] hover:bg-[var(--muted)]/30 transition-colors animate-fade-in"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-full bg-[var(--primary)]/10">
                            <PhoneCall className="size-4 text-[var(--primary)]" />
                          </div>
                          <div>
                            <p className="font-medium">{call.caller || "Unknown"}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">to {call.called}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        {call.caller?.startsWith("+") ? "Inbound" : "Outbound"}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            call.status === "completed" ? "success" :
                            call.status === "missed" ? "warning" : "destructive"
                          }
                        >
                          {call.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm tabular-nums">{formatDuration(call.duration)}</td>
                      <td className="p-4">
                        {call.sentiment && (
                          <Badge
                            variant={
                              call.sentiment === "positive" ? "success" :
                              call.sentiment === "negative" ? "destructive" : "outline"
                            }
                          >
                            {call.sentiment}
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 text-sm text-[var(--muted-foreground)]">
                        {formatRelativeTime(call.created_at)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          {call.recording_url && (
                            <Button variant="ghost" size="icon">
                              <Play className="size-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/calls/${call.id}`}>View</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}