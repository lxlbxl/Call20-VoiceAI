"use client"

import { useState, useEffect, FormEvent } from "react"
import { api, KnowledgeBase } from "@/lib/api"
import { toast } from "sonner"
import { Database, Plus, Trash2, Loader2, FileText, Globe, ClipboardList } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

const SOURCE_TYPES = [
  { value: "text", label: "Text Content", icon: FileText },
  { value: "url", label: "Website URL", icon: Globe },
]

export default function KnowledgeBasesPage() {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [sourceType, setSourceType] = useState("text")
  const [sourceUrl, setSourceUrl] = useState("")
  const [content, setContent] = useState("")

  const fetchKbs = async () => {
    try {
      const res = await api.knowledgeBases.list()
      setKbs(res.data)
    } catch {
      toast.error("Failed to load knowledge bases")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKbs()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name) {
      toast.error("Name is required")
      return
    }
    setSaving(true)
    try {
      await api.knowledgeBases.create({
        name,
        source_type: sourceType,
        source_url: sourceType === "url" ? sourceUrl : undefined,
        content: sourceType === "text" ? content : undefined,
      })
      toast.success("Knowledge base successfully synchronized")
      setShowForm(false)
      setName("")
      setSourceUrl("")
      setContent("")
      fetchKbs()
    } catch {
      toast.error("Failed to create knowledge base")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this knowledge base? This will unbind it from any active agents.")) return
    try {
      await api.knowledgeBases.delete(id)
      toast.success("Knowledge base deleted")
      fetchKbs()
    } catch {
      toast.error("Failed to delete knowledge base")
    }
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Bases</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Build context models by syncing documents or websites for agent knowledge bases.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 font-semibold active:scale-[0.98]">
          <Plus className="size-4 mr-2" />
          Create Base
        </Button>
      </div>

      {/* Main Grid */}
      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-md">
        <CardHeader>
          <CardTitle>Synthesized Context Models</CardTitle>
          <CardDescription>Available semantic data sources linked to voice intelligence.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-[var(--muted)] animate-shimmer" />
              ))}
            </div>
          ) : kbs.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Database className="size-12 mx-auto text-[var(--muted-foreground)] mb-4 animate-pulse-glow" />
              <h3 className="font-semibold text-lg mb-1">No Knowledge Sources</h3>
              <p className="text-sm text-[var(--muted-foreground)] max-w-sm mx-auto mb-4">
                You haven&apos;t connected any custom documents or reference websites. Deploy your first vector core now.
              </p>
              <Button onClick={() => setShowForm(true)} variant="outline">
                <Plus className="size-4 mr-2" />
                Initialize Base
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30 text-[var(--muted-foreground)] font-medium">
                    <th className="text-left p-4">Name</th>
                    <th className="text-left p-4">Source Type</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Chunks</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {kbs.map((kb, idx) => (
                    <tr
                      key={kb.id}
                      className="border-b border-[var(--border)] hover:bg-[var(--muted)]/20 transition-colors animate-fade-in"
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <td className="p-4 font-semibold text-[var(--foreground)]">
                        <div className="flex items-center gap-2.5">
                          <Database className="size-4 text-[var(--primary)]" />
                          <span>{kb.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-xs">
                          {kb.source_type === "url" ? (
                            <Globe className="size-3.5 text-blue-400" />
                          ) : (
                            <FileText className="size-3.5 text-emerald-400" />
                          )}
                          <span className="capitalize">{kb.source_type}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            kb.status === "ready" ? "success" :
                            kb.status === "processing" ? "warning" : "destructive"
                          }
                        >
                          {kb.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-xs font-mono text-[var(--muted-foreground)]">
                        {kb.chunk_count !== undefined ? `${kb.chunk_count} vectors` : "—"}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(kb.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
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
        <DialogContent className="border border-[var(--border)] bg-[var(--card)] sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Connect Knowledge Source</DialogTitle>
            <DialogDescription>
              Train your voice agents on custom catalogs, policies, and document guides.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Knowledge Base Name</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Product Catalogs / Standard Operating Procedures"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Ingestion Method</label>
              <div className="grid grid-cols-2 gap-3">
                {SOURCE_TYPES.map((type) => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setSourceType(type.value)}
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                        sourceType === type.value
                          ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                          : "border-[var(--border)] hover:bg-[var(--muted)]/50 text-[var(--muted-foreground)]"
                      }`}
                    >
                      <Icon className="size-4" />
                      <span>{type.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {sourceType === "url" ? (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Source Website URL</label>
                <Input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://docs.company.com/faqs"
                  required
                />
              </div>
            ) : (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Document Plain Text</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste guidelines, FAQs, or scripts that the agent must reference..."
                  className="flex min-h-[140px] w-full rounded-md border border-[var(--border)] bg-background px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  required
                />
              </div>
            )}

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
                    Synchronizing...
                  </>
                ) : (
                  "Create Source"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
