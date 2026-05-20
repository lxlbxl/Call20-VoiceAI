"use client"

import { useState, useEffect, FormEvent } from "react"
import { api, SMSMessage } from "@/lib/api"
import { toast } from "sonner"
import { MessageSquare, Send, Phone, Clock, Loader2, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { formatRelativeTime } from "@/lib/utils"

export default function SMSPage() {
  const [messages, setMessages] = useState<SMSMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [to, setTo] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)

  const fetchMessages = async () => {
    try {
      const res = await api.sms.list()
      setMessages(res.data || [])
    } catch {
      toast.error("Failed to load messages")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [])

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    if (!to || !message) {
      toast.error("All fields are required")
      return
    }
    setSending(true)
    try {
      await api.sms.send({ to, message })
      toast.success("SMS successfully queued for dispatch")
      setShowForm(false)
      setTo("")
      setMessage("")
      fetchMessages()
    } catch {
      toast.error("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SMS Operations</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Dispatch instant notifications, audit delivery statuses, and configure templates.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 font-semibold active:scale-[0.98]">
          <Send className="size-4 mr-2" />
          Send SMS
        </Button>
      </div>

      {/* Main Grid */}
      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-md">
        <CardHeader>
          <CardTitle>SMS Outbox Logs</CardTitle>
          <CardDescription>Track all outgoing operational & notification messages sent via voice agents.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-[var(--muted)] animate-shimmer" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 px-4">
              <MessageSquare className="size-12 mx-auto text-[var(--muted-foreground)] mb-4 animate-pulse-glow" />
              <h3 className="font-semibold text-lg mb-1">No messages recorded</h3>
              <p className="text-sm text-[var(--muted-foreground)] max-w-sm mx-auto mb-4">
                You haven&apos;t dispatched any text notifications. Start a campaign or alert your system numbers.
              </p>
              <Button onClick={() => setShowForm(true)} variant="outline">
                <Send className="size-4 mr-2" />
                Dispatch First SMS
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30 text-[var(--muted-foreground)] font-medium">
                    <th className="text-left p-4">Recipient</th>
                    <th className="text-left p-4">Message Content</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg, idx) => (
                    <tr
                      key={msg.id || idx}
                      className="border-b border-[var(--border)] hover:bg-[var(--muted)]/20 transition-colors animate-fade-in"
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <td className="p-4 font-semibold text-[var(--foreground)]">
                        <div className="flex items-center gap-2">
                          <Phone className="size-4 text-[var(--primary)]" />
                          <span className="tabular-nums">{msg.to}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs font-medium text-[var(--foreground)] max-w-xs md:max-w-md truncate" title={msg.message}>
                        {msg.message}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            msg.status === "sent" || msg.status === "delivered" ? "success" :
                            msg.status === "pending" ? "warning" : "destructive"
                          }
                        >
                          {msg.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-xs text-[var(--muted-foreground)]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3.5" />
                          <span>{formatRelativeTime(msg.created_at)}</span>
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

      {/* Creation Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="border border-[var(--border)] bg-[var(--card)] sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Send New SMS</DialogTitle>
            <DialogDescription>
              Direct outward alert dispatching system. Use standard international formatting.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSend} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Destination Phone Number</label>
              <Input
                type="tel"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="+234 803 123 4567"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Message Content</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Alert text, operational update, coupon codes, or dynamic credentials..."
                className="flex min-h-[100px] w-full rounded-md border border-[var(--border)] bg-background px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                maxLength={160}
                required
              />
              <span className="block text-[10px] text-right text-[var(--muted-foreground)]">
                {message.length} / 160 characters (1 segment)
              </span>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={sending}
                className="bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 font-semibold"
              >
                {sending ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Dispatching...
                  </>
                ) : (
                  <>
                    <Send className="size-3.5 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
