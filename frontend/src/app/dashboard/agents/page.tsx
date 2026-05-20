"use client"

import { useEffect, useState } from "react"
import { Plus, Bot, Phone, Play, MoreVertical } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { api, Agent } from "@/lib/api"
import Link from "next/link"

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await api.agents.list()
        setAgents(res.data)
      } catch (error) {
        console.error("Failed to fetch agents:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchAgents()
  }, [])

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Voice Agents</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Manage your AI voice agents and their configurations.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/agents/new">
            <Plus className="size-4" />
            Create Agent
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Search agents..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-md"
      />

      {/* Agents Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-shimmer h-48" />
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-[var(--border)] rounded-lg">
          <Bot className="size-12 mx-auto text-[var(--muted-foreground)] mb-4" />
          <h3 className="font-semibold mb-2">No agents found</h3>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            {searchQuery ? "Try a different search term" : "Create your first voice agent to get started"}
          </p>
          {!searchQuery && (
            <Button asChild>
              <Link href="/dashboard/agents/new">
                <Plus className="size-4" />
                Create Agent
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent, idx) => (
            <Card
              key={agent.id}
              className="hover:shadow-lg transition-all duration-200 animate-fade-in group"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                      <Bot className="size-5 text-[var(--primary)]" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <p className="text-xs text-[var(--muted-foreground)]">{agent.voice_type}</p>
                    </div>
                  </div>
                  <Badge variant={agent.status === "active" ? "success" : "outline"}>
                    {agent.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">Total Calls</span>
                    <span className="font-medium">{agent.call_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">Created</span>
                    <span className="font-medium">{new Date(agent.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2 pt-3">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link href={`/agents/${agent.id}`}>
                        Configure
                      </Link>
                    </Button>
                    <Button variant="outline" size="icon" className="shrink-0">
                      <Phone className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}