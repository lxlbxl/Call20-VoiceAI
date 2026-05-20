"use client"

import { useState, useEffect, FormEvent } from "react"
import { api, DID } from "@/lib/api"
import { toast } from "sonner"
import { Phone, Plus, Trash2, Loader2, Globe, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const COUNTRIES = [
  { value: "US", label: "United States", flag: "🇺🇸" },
  { value: "GB", label: "United Kingdom", flag: "🇬🇧" },
  { value: "NG", label: "Nigeria", flag: "🇳🇬" },
  { value: "KE", label: "Kenya", flag: "🇰🇪" },
  { value: "GH", label: "Ghana", flag: "🇬🇭" },
  { value: "ZA", label: "South Africa", flag: "🇿🇦" },
  { value: "CA", label: "Canada", flag: "🇨🇦" },
  { value: "AU", label: "Australia", flag: "🇦🇺" },
]

const NUMBER_TYPES = [
  { value: "local", label: "Local" },
  { value: "toll_free", label: "Toll-Free" },
  { value: "mobile", label: "Mobile" },
]

export default function DIDsPage() {
  const [dids, setDids] = useState<DID[]>([])
  const [loading, setLoading] = useState(true)
  const [provisioning, setProvisioning] = useState(false)
  const [countryCode, setCountryCode] = useState("US")
  const [numberType, setNumberType] = useState("local")

  const fetchDids = async () => {
    try {
      const res = await api.dids.list()
      setDids(res.data)
    } catch {
      toast.error("Failed to load phone numbers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDids()
  }, [])

  const handleProvision = async (e: FormEvent) => {
    e.preventDefault()
    setProvisioning(true)
    try {
      await api.dids.provision({ country_code: countryCode, number_type: numberType })
      toast.success("Phone number provisioned successfully")
      fetchDids()
    } catch {
      toast.error("Failed to provision number")
    } finally {
      setProvisioning(false)
    }
  }

  const handleRelease = async (id: string) => {
    if (!confirm("Are you sure you want to release this phone number?")) return
    try {
      await api.dids.release(id)
      toast.success("Phone number released")
      fetchDids()
    } catch {
      toast.error("Failed to release number")
    }
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Phone Numbers (DIDs)</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Provision and route direct inward dialing numbers to your voice agents.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Provisioning Form */}
        <Card className="lg:col-span-1 border border-[var(--border)] bg-[var(--card)] shadow-md">
          <CardHeader>
            <CardTitle>Provision Number</CardTitle>
            <CardDescription>Instant activation of local or international lines.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProvision} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Country Selection</label>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-[var(--border)] bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 transition-all cursor-pointer"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.flag} {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Line Type</label>
                <select
                  value={numberType}
                  onChange={(e) => setNumberType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-[var(--border)] bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 transition-all cursor-pointer"
                >
                  {NUMBER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="submit"
                disabled={provisioning}
                className="w-full bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 font-semibold active:scale-[0.98]"
              >
                {provisioning ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Activating Line...
                  </>
                ) : (
                  <>
                    <Plus className="size-4 mr-2" />
                    Provision Number
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Numbers Inventory */}
        <Card className="lg:col-span-2 border border-[var(--border)] bg-[var(--card)] shadow-md">
          <CardHeader>
            <CardTitle>Active Inventory</CardTitle>
            <CardDescription>Your running list of connected numbers.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-lg bg-[var(--muted)] animate-shimmer" />
                ))}
              </div>
            ) : dids.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Phone className="size-12 mx-auto text-[var(--muted-foreground)] mb-4" />
                <h3 className="font-semibold text-lg mb-1">No phone numbers</h3>
                <p className="text-sm text-[var(--muted-foreground)] max-w-sm mx-auto">
                  You don&apos;t have any active lines provisioned yet. Use the selector panel to claim your first phone number.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30 text-[var(--muted-foreground)] font-medium">
                      <th className="text-left p-4">Phone Number</th>
                      <th className="text-left p-4">Region</th>
                      <th className="text-left p-4">Line Type</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-right p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dids.map((did, idx) => (
                      <tr
                        key={did.id}
                        className="border-b border-[var(--border)] hover:bg-[var(--muted)]/20 transition-colors animate-fade-in"
                        style={{ animationDelay: `${idx * 40}ms` }}
                      >
                        <td className="p-4 font-semibold text-[var(--foreground)]">
                          <div className="flex items-center gap-2">
                            <Phone className="size-4 text-[var(--primary)]" />
                            <span className="tabular-nums">{did.phone_number}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span>
                              {COUNTRIES.find((c) => c.value === did.country_code)?.flag || "🌐"}
                            </span>
                            <span>
                              {COUNTRIES.find((c) => c.value === did.country_code)?.label || did.country_code}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="capitalize text-xs">
                            {did.number_type || "local"}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge variant={did.status === "active" ? "success" : "destructive"}>
                            {did.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRelease(did.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            title="Release number"
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
      </div>
    </div>
  )
}
