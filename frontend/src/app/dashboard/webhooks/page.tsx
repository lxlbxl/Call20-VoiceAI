"use client"

import { useState, useEffect, FormEvent } from "react"
import { api, Webhook } from "@/lib/api"
import { toast } from "sonner"
import { Webhook as WebhookIcon, Plus, Trash2, Edit2, Loader2, Play, Lock, Eye, Globe } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

const ALL_EVENTS = [
  "call.started",
  "call.ended",
  "call.failed",
  "sms.sent",
  "sms.delivered",
  "sms.failed",
  "agent.created",
  "agent.updated",
  "agent.deleted",
  "payment.completed",
  "payment.failed",
  "kb.ready",
  "kb.failed",
]

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [url, setUrl] = useState("")
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [secret, setSecret] = useState("")

  const fetchWebhooks = async () => {
    try {
      const res = await api.webhooks.list()
      setWebhooks(res.data)
    } catch {
      toast.error("Failed to load webhooks")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWebhooks()
  }, [])

  const openCreate = () => {
    setUrl("")
    setSelectedEvents([])
    setSecret("")
    setEditingId(null)
    setShowForm(true)
  }

  const openEdit = (wh: Webhook) => {
    setUrl(wh.url)
    setSelectedEvents(wh.events || [])
    setSecret(wh.secret || "")
    setEditingId(wh.id)
    setShowForm(true)
  }

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
  }

  const toggleAllEvents = () => {
    if (selectedEvents.length === ALL_EVENTS.length) {
      setSelectedEvents([])
    } else {
      setSelectedEvents([...ALL_EVENTS])
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!url) {
      toast.error("URL is required")
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await api.webhooks.update(editingId, {
          url,
          events: selectedEvents,
          secret: secret || undefined,
        })
        toast.success("Webhook endpoint updated")
      } else {
        await api.webhooks.create({
          url,
          events: selectedEvents,
          secret: secret || undefined,
        })
        toast.success("Webhook endpoint created")
      }
      setShowForm(false)
      fetchWebhooks()
    } catch {
      toast.error("Failed to save webhook")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this webhook endpoint?")) return
    try {
      await api.webhooks.delete(id)
      toast.success("Webhook endpoint deleted")
      fetchWebhooks()
    } catch {
      toast.error("Failed to delete webhook")
    }
  }

  const handleTest = async (id: string) => {
    try {
      await api.webhooks.test(id)
      toast.success("Test payload successfully dispatched!")
    } catch {
      toast.error("Webhook test dispatch failed")
    }
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Configure real-time event endpoints to sync call streams and transaction payloads to your system.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 font-semibold active:scale-[0.98]">
          <Plus className="size-4 mr-2" />
          Add Endpoint
        </Button>
      </div>

      {/* Main Board */}
      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-md">
        <CardHeader>
          <CardTitle>Webhook Listeners</CardTitle>
          <CardDescription>Your registered external API receivers.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-[var(--muted)] animate-shimmer" />
              ))}
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-16 px-4">
              <WebhookIcon className="size-12 mx-auto text-[var(--muted-foreground)] mb-4 animate-pulse-glow" />
              <h3 className="font-semibold text-lg mb-1">No Webhooks Configured</h3>
              <p className="text-sm text-[var(--muted-foreground)] max-w-sm mx-auto mb-4">
                You haven&apos;t connected any HTTP POST endpoints. Connect your backend system to receive active voice agent events instantly.
              </p>
              <Button onClick={openCreate} variant="outline">
                <Plus className="size-4 mr-2" />
                Add Webhook
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30 text-[var(--muted-foreground)] font-medium">
                    <th className="text-left p-4">Endpoint URL</th>
                    <th className="text-left p-4">Subscribed Events</th>
                    <th className="text-left p-4">Security</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {webhooks.map((wh, idx) => (
                    <tr
                      key={wh.id || idx}
                      className="border-b border-[var(--border)] hover:bg-[var(--muted)]/20 transition-colors animate-fade-in"
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Globe className="size-4 text-[var(--primary)]" />
                          <span className="font-mono text-xs font-semibold text-[var(--foreground)] truncate max-w-xs md:max-w-md">
                            {wh.url}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-[280px]">
                        {(wh.events || []).slice(0, 3).map((ev: string) => (
                          <Badge key={ev} variant="outline" className="text-[10px] py-0 px-1.5 font-normal bg-[var(--muted)]/50 border-none">
                            {ev}
                          </Badge>
                        ))}
                          {(wh.events || []).length > 3 && (
                            <Badge variant="outline" className="text-[10px] py-0.5 font-semibold text-[var(--primary)]">
                              +{(wh.events || []).length - 3} more
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {wh.secret ? (
                          <div className="flex items-center gap-1 text-xs text-emerald-400">
                            <Lock className="size-3" />
                            <span>Signed</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--muted-foreground)]">None</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant={wh.status === "active" ? "success" : "destructive"}>
                          {wh.status || "active"}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTest(wh.id)}
                            className="text-sky-500 hover:text-sky-600 hover:bg-sky-500/10"
                            title="Trigger Test Event"
                          >
                            <Play className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(wh)}
                            className="text-[var(--muted-foreground)] hover:text-white"
                          >
                            <Edit2 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(wh.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          >
                            <Trash2 className="size-4" />
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

      {/* Creation/Edit Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="border border-[var(--border)] bg-[var(--card)] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modify Webhook Endpoint" : "Create Webhook Endpoint"}</DialogTitle>
            <DialogDescription>
              Deploy real-time callbacks. Select which system updates to transmit.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Endpoint Post URL</label>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.yourdomain.com/v1/voice-webhook"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Subscribed Topics</label>
                <button
                  type="button"
                  onClick={toggleAllEvents}
                  className="text-[10px] text-[var(--primary)] hover:underline font-bold"
                >
                  {selectedEvents.length === ALL_EVENTS.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto border border-[var(--border)] rounded-md p-3 bg-[var(--background)]">
                {ALL_EVENTS.map((ev) => (
                  <label key={ev} className="flex items-center gap-2 text-xs text-[var(--foreground)] cursor-pointer hover:text-white transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(ev)}
                      onChange={() => toggleEvent(ev)}
                      className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                    />
                    <span>{ev}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Signing Secret (HMAC-SHA256)</label>
              <Input
                type="text"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Provide a strong password/key to verify payload integrity"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 font-semibold"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Deploying...
                  </>
                ) : editingId ? (
                  "Update Endpoint"
                ) : (
                  "Create Endpoint"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
