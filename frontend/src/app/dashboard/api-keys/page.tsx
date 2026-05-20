"use client"

import { useState, useEffect, FormEvent } from "react"
import { api, APIKey } from "@/lib/api"
import { toast } from "sonner"
import { Key, Plus, Trash2, Loader2, Copy, Check, ShieldAlert, Calendar } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { formatRelativeTime } from "@/lib/utils"

export default function APIKeysPage() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [newlyCreated, setNewlyCreated] = useState<APIKey | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchKeys = async () => {
    try {
      const res = await api.apiKeys.list()
      setApiKeys(res.data)
    } catch {
      toast.error("Failed to load API keys")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKeys()
  }, [])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!name) {
      toast.error("Name is required")
      return
    }
    setSaving(true)
    try {
      const res = await api.apiKeys.create({ name })
      setNewlyCreated(res.data)
      setShowForm(false)
      setName("")
      fetchKeys()
      toast.success("API key successfully generated")
    } catch {
      toast.error("Failed to generate API key")
    } finally {
      setSaving(false)
    }
  }

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? This action is immediate and will break all active integrations using this key.")) return
    try {
      await api.apiKeys.revoke(id)
      toast.success("API key revoked successfully")
      fetchKeys()
    } catch {
      toast.error("Failed to revoke API key")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success("API key copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Developer API Keys</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Securely authenticate external applications and servers with the Call20 infrastructure.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 font-semibold active:scale-[0.98]">
          <Plus className="size-4 mr-2" />
          Generate Key
        </Button>
      </div>

      {/* Newly Created Key Alert Box */}
      {newlyCreated && newlyCreated.key && (
        <Card className="border border-orange-500/30 bg-orange-500/5 shadow-lg relative overflow-hidden animate-slide-up">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--primary)]" />
          <CardHeader className="flex flex-row items-start gap-4 pb-2">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] shrink-0">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <CardTitle className="text-orange-500 font-bold">New Security API Key Generated</CardTitle>
              <CardDescription className="text-sm text-[var(--muted-foreground)] mt-1">
                Copy this key now. For security purposes, it will never be displayed in plain text again.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pl-14">
            <div className="flex items-center gap-2 max-w-xl bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5">
              <code className="flex-1 font-mono text-sm font-semibold select-all text-white break-all pr-2">
                {newlyCreated.key}
              </code>
              <Button
                onClick={() => copyToClipboard(newlyCreated.key!)}
                variant="outline"
                size="icon"
                className="size-8 shrink-0 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] hover:border-[var(--primary)]/20"
              >
                {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keys Table */}
      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-md">
        <CardHeader>
          <CardTitle>Active Access Credentials</CardTitle>
          <CardDescription>Authentication tokens active in production.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-[var(--muted)] animate-shimmer" />
              ))}
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Key className="size-12 mx-auto text-[var(--muted-foreground)] mb-4 animate-pulse-glow" />
              <h3 className="font-semibold text-lg mb-1">No API Credentials</h3>
              <p className="text-sm text-[var(--muted-foreground)] max-w-sm mx-auto mb-4">
                You haven&apos;t generated any programmatic access tokens. Deploy credentials to integrate external CRM scripts.
              </p>
              <Button onClick={() => setShowForm(true)} variant="outline">
                <Plus className="size-4 mr-2" />
                Initialize Key
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30 text-[var(--muted-foreground)] font-medium">
                    <th className="text-left p-4">Key Label</th>
                    <th className="text-left p-4">Authentication Token</th>
                    <th className="text-left p-4">Created Time</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((ak, idx) => (
                    <tr
                      key={ak.id || idx}
                      className="border-b border-[var(--border)] hover:bg-[var(--muted)]/20 transition-colors animate-fade-in"
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <td className="p-4 font-semibold text-[var(--foreground)]">
                        <div className="flex items-center gap-2.5">
                          <Key className="size-4 text-[var(--primary)]" />
                          <span>{ak.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <code className="text-xs bg-[var(--background)] border border-[var(--border)] rounded-md px-2.5 py-1 font-mono text-[var(--muted-foreground)] select-none">
                          {ak.masked_key || "c20_live_••••••••••••••••"}
                        </code>
                      </td>
                      <td className="p-4 text-xs text-[var(--muted-foreground)]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3.5" />
                          <span>{formatRelativeTime(ak.created_at)}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRevoke(ak.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          title="Revoke programmatic access"
                        >
                          <Trash2 className="size-4" />
                        </Button>
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
        <DialogContent className="border border-[var(--border)] bg-[var(--card)] sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Generate Access Token</DialogTitle>
            <DialogDescription>
              Assign a mnemonic label to distinguish your programmatic interfaces.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Key Mnemonic Label</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Staging Environment / Node backend server"
                required
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
                    Generating...
                  </>
                ) : (
                  "Generate Token"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
