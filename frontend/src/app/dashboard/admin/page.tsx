"use client"

import { useState, useEffect, FormEvent } from "react"
import { api, Tenant, Coupon, AuditLog } from "@/lib/api"
import { toast } from "sonner"
import {
  Users,
  PhoneCall,
  Bot,
  DollarSign,
  Activity,
  Plus,
  Trash2,
  Loader2,
  ShieldAlert,
  CheckCircle,
  Calendar,
  Ticket,
  FileText,
  Sliders,
  Search,
  Building2,
  Lock,
  Unlock,
  Settings,
  Info
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { formatRelativeTime } from "@/lib/utils"

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "tenants" | "coupons" | "logs" | "settings">("overview")
  const [loading, setLoading] = useState(true)

  // Overview Stats state
  const [stats, setStats] = useState({
    active_tenants: 0,
    total_calls: 0,
    active_agents: 0,
    gross_revenue: 0,
  })

  // Tab 1: Tenants List & Actions
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [searchTenant, setSearchTenant] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [showTenantModal, setShowTenantModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Tab 2: Coupons Manager
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [showCouponModal, setShowCouponModal] = useState(false)
  const [creatingCoupon, setCreatingCoupon] = useState(false)
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    type: "fixed",
    value: 10,
    max_uses: 100,
    description: "",
  })

  // Tab 3: Audit Logs
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [searchLogAction, setSearchLogAction] = useState("")

  // Tab 4: Reseller Settings
  const [systemSettings, setSystemSettings] = useState<Record<string, string>>({
    global_rate_limit: "25",
    outbound_retry_limit: "3",
    stripe_live_mode: "false",
    signup_wallet_bonus: "5.00",
  })
  const [savingSettings, setSavingSettings] = useState(false)

  // Master Initializer
  const initAdminData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Reseller stats
      const statsRes = await api.admin.dashboard()
      if (statsRes?.data) {
        setStats({
          active_tenants: statsRes.data.active_tenants || 0,
          total_calls: statsRes.data.total_calls || 0,
          active_agents: statsRes.data.active_agents || 0,
          gross_revenue: statsRes.data.gross_revenue || 0,
        })
      }

      // 2. Fetch Tenants
      const tenantsRes = await api.admin.tenants()
      setTenants(tenantsRes.data || [])

      // 3. Fetch Coupons
      const couponsRes = await api.admin.coupons()
      setCoupons(couponsRes.data || [])

      // 4. Fetch Audit Logs
      const logsRes = await api.admin.auditLogs()
      setLogs(logsRes.data || [])
    } catch {
      toast.error("Failed to sync administration panel context")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    initAdminData()
  }, [])

  // Tenant Operations
  const handleTenantAction = async (tenantId: string, currentStatus: string) => {
    const action = currentStatus === "suspended" ? "activate" : "suspend"
    const confirmMsg =
      action === "suspend"
        ? "Are you sure you want to suspend this client tenant space? All voice call routing and DID numbers under this client will be locked instantly."
        : "Are you sure you want to reactivate this client workspace?"

    if (!confirm(confirmMsg)) return

    setActionLoading(tenantId)
    try {
      await api.admin.tenantAction(tenantId, action)
      toast.success(`Tenant workspace successfully ${action}d`)
      
      // Refresh list
      const res = await api.admin.tenants()
      setTenants(res.data || [])
    } catch {
      toast.error(`Failed to ${action} tenant workspace`)
    } finally {
      setActionLoading(null)
    }
  }

  const inspectTenant = async (tenantId: string) => {
    try {
      const res = await api.admin.tenantDetail(tenantId)
      setSelectedTenant(res.data)
      setShowTenantModal(true)
    } catch {
      toast.error("Failed to inspect tenant details")
    }
  }

  // Coupon Operations
  const handleCreateCoupon = async (e: FormEvent) => {
    e.preventDefault()
    if (!newCoupon.code.trim()) {
      toast.error("Coupon code is required")
      return
    }
    setCreatingCoupon(true)
    try {
      await api.admin.createCoupon({
        code: newCoupon.code.toUpperCase(),
        type: newCoupon.type,
        value: Number(newCoupon.value),
        max_uses: Number(newCoupon.max_uses),
        description: newCoupon.description,
      })
      toast.success(`Coupon ${newCoupon.code.toUpperCase()} successfully deployed`)
      
      // Refresh
      const couponsRes = await api.admin.coupons()
      setCoupons(couponsRes.data || [])
      
      // Reset & close
      setShowCouponModal(false)
      setNewCoupon({ code: "", type: "fixed", value: 10, max_uses: 100, description: "" })
    } catch {
      toast.error("Failed to deploy promotion coupon")
    } finally {
      setCreatingCoupon(false)
    }
  }

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promotion coupon? Active clients will no longer be able to redeem this code.")) return
    try {
      await api.admin.deleteCoupon(id)
      toast.success("Promotion coupon deleted")
      
      // Refresh
      const couponsRes = await api.admin.coupons()
      setCoupons(couponsRes.data || [])
    } catch {
      toast.error("Failed to delete coupon")
    }
  }

  // Settings Operation
  const handleUpdateSystemSetting = async (key: string, value: string) => {
    try {
      await api.admin.updateSetting(key, value)
      setSystemSettings((prev) => ({ ...prev, [key]: value }))
      toast.success(`Setting '${key}' saved`)
    } catch {
      toast.error("Failed to update setting")
    }
  }

  const handleSaveAllSettings = async (e: FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    try {
      for (const [key, value] of Object.entries(systemSettings)) {
        await api.admin.updateSetting(key, value)
      }
      toast.success("Global reseller configuration updated successfully")
    } catch {
      toast.error("Failed to update some reseller configurations")
    } finally {
      setSavingSettings(false)
    }
  }

  // Filtering lists
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name?.toLowerCase().includes(searchTenant.toLowerCase()) ||
      t.email?.toLowerCase().includes(searchTenant.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTenant.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredLogs = logs.filter((log) => {
    return (
      log.action?.toLowerCase().includes(searchLogAction.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchLogAction.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchLogAction.toLowerCase())
    )
  })

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* Top Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unified Reseller Admin Panel</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Global management portal for billing coupons, client workspace security, system configurations, and action audit streams.
          </p>
        </div>
        <Badge className="bg-[var(--primary)] text-white hover:bg-[var(--primary)] font-bold px-3 py-1 text-xs tracking-wider uppercase">
          RESELLER CONTROL ACTIVE
        </Badge>
      </div>

      {/* Tabs Selector Bar */}
      <div className="flex flex-wrap border-b border-[var(--border)] gap-2 md:gap-6">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold tracking-wide transition-all border-b-2 outline-none ${
            activeTab === "overview"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <Activity className="size-4" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab("tenants")}
          className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold tracking-wide transition-all border-b-2 outline-none ${
            activeTab === "tenants"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <Users className="size-4" />
          Tenant Management
        </button>
        <button
          onClick={() => setActiveTab("coupons")}
          className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold tracking-wide transition-all border-b-2 outline-none ${
            activeTab === "coupons"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <Ticket className="size-4" />
          Promo Coupons
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold tracking-wide transition-all border-b-2 outline-none ${
            activeTab === "logs"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <FileText className="size-4" />
          Audit Logs
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold tracking-wide transition-all border-b-2 outline-none ${
            activeTab === "settings"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <Sliders className="size-4" />
          Global Settings
        </button>
      </div>

      {/* Tabs Contents */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-[var(--muted)] animate-shimmer rounded-xl border border-[var(--border)]" />
            ))}
          </div>
          <div className="h-96 bg-[var(--muted)] animate-shimmer rounded-xl border border-[var(--border)]" />
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Financial & Operator Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Active Tenants */}
                <Card className="border border-[var(--border)] bg-[var(--card)] shadow-md overflow-hidden relative group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[var(--primary)]" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2 shrink-0">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Active Tenants
                    </CardTitle>
                    <Building2 className="size-5 text-[var(--primary)]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-extrabold text-white">{stats.active_tenants}</div>
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-1">Client workspaces active</p>
                  </CardContent>
                </Card>

                {/* Total Calls Routed */}
                <Card className="border border-[var(--border)] bg-[var(--card)] shadow-md overflow-hidden relative group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2 shrink-0">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Total Calls Routed
                    </CardTitle>
                    <PhoneCall className="size-5 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-extrabold text-white">{stats.total_calls}</div>
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-1">AI voice connections handled</p>
                  </CardContent>
                </Card>

                {/* Total Voice Agents */}
                <Card className="border border-[var(--border)] bg-[var(--card)] shadow-md overflow-hidden relative group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2 shrink-0">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Active Voice Agents
                    </CardTitle>
                    <Bot className="size-5 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-extrabold text-white">{stats.active_agents}</div>
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-1">Active virtual operator bots</p>
                  </CardContent>
                </Card>

                {/* Gross Revenue */}
                <Card className="border border-[var(--border)] bg-[var(--card)] shadow-md overflow-hidden relative group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2 shrink-0">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      System Balance Credits
                    </CardTitle>
                    <DollarSign className="size-5 text-amber-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-extrabold text-white">
                      ${stats.gross_revenue.toFixed(2)}
                    </div>
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-1">Client credits deposited</p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Details Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* System Health */}
                <Card className="border border-[var(--border)] bg-[var(--card)] shadow-md md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sliders className="size-4 text-[var(--primary)]" />
                      <span>Reseller System Capabilities</span>
                    </CardTitle>
                    <CardDescription>Status and configurations of the cloud environment</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                        <span className="block text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider font-semibold">Web Server URL</span>
                        <span className="block text-xs font-mono font-semibold text-white mt-1 select-all truncate">
                          {typeof window !== "undefined" ? window.location.origin : "call20.com"}
                        </span>
                      </div>
                      <div className="p-4 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                        <span className="block text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider font-semibold">Rate Limit</span>
                        <span className="block text-xs font-bold text-white mt-1">
                          {systemSettings.global_rate_limit} requests / sec
                        </span>
                      </div>
                      <div className="p-4 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                        <span className="block text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider font-semibold">Automatic Retry Limit</span>
                        <span className="block text-xs font-bold text-white mt-1">
                          {systemSettings.outbound_retry_limit} attempts
                        </span>
                      </div>
                      <div className="p-4 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                        <span className="block text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider font-semibold">Gateway Production Mode</span>
                        <span className="block text-xs mt-1">
                          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${
                            systemSettings.stripe_live_mode === "true" 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          }`}>
                            {systemSettings.stripe_live_mode === "true" ? "LIVE" : "SANDBOX"}
                          </Badge>
                        </span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4 flex gap-3.5">
                      <Info className="size-5 text-[var(--primary)] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-orange-500">Reseller Dashboard Workspace</h4>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                          This administrator module grants structural operations across client spaces. Double-check all promotions, coupons, and wallet allocations prior to saving.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Audit Logs Sidebar preview */}
                <Card className="border border-[var(--border)] bg-[var(--card)] shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Recent Audit Stream</CardTitle>
                    <CardDescription>Activity feed across client domains</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 max-h-[300px] overflow-y-auto scrollbar-thin">
                    {logs.slice(0, 5).map((log, idx) => (
                      <div key={log.id || idx} className="text-xs border-b border-[var(--border)] pb-2.5 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-semibold text-white break-all">{log.action}</span>
                          <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">{formatRelativeTime(log.created_at)}</span>
                        </div>
                        <p className="text-[10px] text-[var(--muted-foreground)] mt-1 font-mono break-all">{log.user_email || "System Engine"}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 2: TENANT MANAGEMENT */}
          {activeTab === "tenants" && (
            <div className="space-y-6">
              {/* Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:max-w-md">
                  <Search className="absolute left-3 top-3 size-4 text-[var(--muted-foreground)]" />
                  <Input
                    type="text"
                    value={searchTenant}
                    onChange={(e) => setSearchTenant(e.target.value)}
                    placeholder="Search tenants by name, email or ID..."
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] shrink-0">Filter Status:</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-10 px-3 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-all font-semibold appearance-none cursor-pointer pr-8"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M7 9l3 3 3-3' stroke='%238B8F9E' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                      backgroundPosition: "right 0.75rem center",
                      backgroundSize: "1.25rem",
                      backgroundRepeat: "no-repeat",
                    }}
                  >
                    <option value="all">ALL STATUSES</option>
                    <option value="active">ACTIVE ONLY</option>
                    <option value="suspended">SUSPENDED ONLY</option>
                  </select>
                </div>
              </div>

              {/* Tenants Grid/Table */}
              <Card className="border border-[var(--border)] bg-[var(--card)] shadow-md">
                <CardHeader>
                  <CardTitle>Client Spaces Directory</CardTitle>
                  <CardDescription>Detailed operations and structural review of client organization environments.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {filteredTenants.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <Building2 className="size-12 mx-auto text-[var(--muted-foreground)] mb-4 animate-pulse-glow" />
                      <h3 className="font-semibold text-lg mb-1">No Tenants Found</h3>
                      <p className="text-sm text-[var(--muted-foreground)] max-w-sm mx-auto">
                        No workspaces matched your current query constraints.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30 text-[var(--muted-foreground)] font-medium">
                            <th className="text-left p-4">Tenant Space Name</th>
                            <th className="text-left p-4">Super Administrator</th>
                            <th className="text-left p-4">Created Time</th>
                            <th className="text-left p-4">Global Status</th>
                            <th className="text-right p-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTenants.map((t, idx) => (
                            <tr
                              key={t.id || idx}
                              className="border-b border-[var(--border)] hover:bg-[var(--muted)]/20 transition-colors animate-fade-in"
                              style={{ animationDelay: `${idx * 40}ms` }}
                            >
                              <td className="p-4">
                                <button
                                  onClick={() => inspectTenant(t.id)}
                                  className="text-left group outline-none"
                                >
                                  <p className="font-bold text-white group-hover:text-[var(--primary)] transition-colors flex items-center gap-1.5">
                                    <span>{t.name || "Anonymous Client"}</span>
                                  </p>
                                  <p className="text-[10px] text-[var(--muted-foreground)] font-mono">ID: {t.id}</p>
                                </button>
                              </td>
                              <td className="p-4 text-[var(--muted-foreground)] font-medium">
                                {t.email || "—"}
                              </td>
                              <td className="p-4 text-xs text-[var(--muted-foreground)]">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="size-3.5" />
                                  <span>{formatRelativeTime(t.created_at)}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                    t.status === "active"
                                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                      : "bg-red-500/10 text-red-500 border-red-500/20"
                                  }`}
                                >
                                  {t.status}
                                </Badge>
                              </td>
                              <td className="p-4 text-right space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => inspectTenant(t.id)}
                                  className="text-xs hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] hover:border-[var(--primary)]/20"
                                >
                                  Inspect Details
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={actionLoading === t.id}
                                  onClick={() => handleTenantAction(t.id, t.status)}
                                  className={`size-8 rounded ${
                                    t.status === "suspended"
                                      ? "text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                      : "text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                  }`}
                                  title={t.status === "suspended" ? "Reactivate Space" : "Suspend Space"}
                                >
                                  {actionLoading === t.id ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : t.status === "suspended" ? (
                                    <Unlock className="size-4" />
                                  ) : (
                                    <Lock className="size-4" />
                                  )}
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
          )}

          {/* TAB 3: PROMO COUPONS */}
          {activeTab === "coupons" && (
            <div className="space-y-6">
              {/* Header section with add button */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">System Promotional Coupons</h2>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Create promo balances that clients can redeem to fund their wallets.
                  </p>
                </div>
                <Button
                  onClick={() => setShowCouponModal(true)}
                  className="bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 font-semibold active:scale-[0.98]"
                >
                  <Plus className="size-4 mr-2" />
                  Deploy Coupon
                </Button>
              </div>

              {/* Coupons List */}
              <Card className="border border-[var(--border)] bg-[var(--card)] shadow-md">
                <CardHeader>
                  <CardTitle>Active Wallet Coupons</CardTitle>
                  <CardDescription>Tokens redeemable by client organizations in their billing dashboard.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {coupons.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <Ticket className="size-12 mx-auto text-[var(--muted-foreground)] mb-4 animate-pulse-glow" />
                      <h3 className="font-semibold text-lg mb-1">No Coupons Deployed</h3>
                      <p className="text-sm text-[var(--muted-foreground)] max-w-sm mx-auto mb-4">
                        Deploy your first balance promotion to stimulate system trials.
                      </p>
                      <Button onClick={() => setShowCouponModal(true)} variant="outline">
                        <Plus className="size-4 mr-2" />
                        Deploy Promo
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30 text-[var(--muted-foreground)] font-medium">
                            <th className="text-left p-4">Promo Code</th>
                            <th className="text-left p-4">Gift Type</th>
                            <th className="text-left p-4">Coupon Value</th>
                            <th className="text-left p-4">Distribution Limit</th>
                            <th className="text-left p-4">Uses Count</th>
                            <th className="text-right p-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {coupons.map((c, idx) => (
                            <tr
                              key={c.id || idx}
                              className="border-b border-[var(--border)] hover:bg-[var(--muted)]/20 transition-colors animate-fade-in"
                              style={{ animationDelay: `${idx * 40}ms` }}
                            >
                              <td className="p-4 font-bold text-white tracking-wider">
                                <div className="flex items-center gap-2">
                                  <Ticket className="size-4 text-[var(--primary)]" />
                                  <code className="bg-[var(--background)] px-2.5 py-0.5 border border-[var(--border)] rounded font-mono text-sm">
                                    {c.code}
                                  </code>
                                </div>
                                {c.description && (
                                  <p className="text-[10px] font-normal text-[var(--muted-foreground)] mt-1 max-w-xs truncate">
                                    {c.description}
                                  </p>
                                )}
                              </td>
                              <td className="p-4 uppercase text-xs text-[var(--muted-foreground)] font-semibold">
                                {c.type === "percentage" ? "Percentage Off" : "Wallet Balance Addition"}
                              </td>
                              <td className="p-4 font-bold text-white">
                                {c.type === "percentage" ? `${c.value}%` : `$${c.value.toFixed(2)}`}
                              </td>
                              <td className="p-4 text-[var(--muted-foreground)] text-xs">
                                {c.max_uses ? `${c.max_uses} maximum` : "Unlimited Uses"}
                              </td>
                              <td className="p-4">
                                <Badge variant="outline" className="text-[10px] font-semibold bg-[var(--primary)]/5 text-[var(--primary)] border-[var(--primary)]/20 px-2 py-0.5">
                                  {c.uses_count || 0} times
                                </Badge>
                              </td>
                              <td className="p-4 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteCoupon(c.id)}
                                  className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                  title="Retire promotion"
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
          )}

          {/* TAB 4: AUDIT LOGS */}
          {activeTab === "logs" && (
            <div className="space-y-6">
              {/* Search log action filter */}
              <div className="flex gap-4 max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-3 size-4 text-[var(--muted-foreground)]" />
                  <Input
                    type="text"
                    value={searchLogAction}
                    onChange={(e) => setSearchLogAction(e.target.value)}
                    placeholder="Search logs by action, email or details..."
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Logs Table */}
              <Card className="border border-[var(--border)] bg-[var(--card)] shadow-md">
                <CardHeader>
                  <CardTitle>System Action Audit Logs</CardTitle>
                  <CardDescription>Real-time telemetry log tracking user operations across client spaces.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {filteredLogs.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <FileText className="size-12 mx-auto text-[var(--muted-foreground)] mb-4 animate-pulse-glow" />
                      <h3 className="font-semibold text-lg mb-1">No Audit Logs</h3>
                      <p className="text-sm text-[var(--muted-foreground)] max-w-sm mx-auto">
                        No structural event triggers found matching the search constraints.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30 text-[var(--muted-foreground)] font-medium">
                            <th className="text-left p-4">Triggered Event</th>
                            <th className="text-left p-4">Operator Email</th>
                            <th className="text-left p-4">Context Details</th>
                            <th className="text-right p-4">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredLogs.map((log, idx) => (
                            <tr
                              key={log.id || idx}
                              className="border-b border-[var(--border)] hover:bg-[var(--muted)]/20 transition-colors animate-fade-in text-xs"
                              style={{ animationDelay: `${idx * 20}ms` }}
                            >
                              <td className="p-4 font-bold text-white">
                                {log.action}
                              </td>
                              <td className="p-4 font-mono text-[var(--muted-foreground)]">
                                {log.user_email || "System Engine"}
                              </td>
                              <td className="p-4 text-[var(--muted-foreground)] font-medium max-w-sm truncate" title={log.details}>
                                {log.details || "—"}
                              </td>
                              <td className="p-4 text-right text-[var(--muted-foreground)]">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Calendar className="size-3.5" />
                                  <span>{formatRelativeTime(log.created_at)}</span>
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
          )}

          {/* TAB 5: SYSTEM GLOBAL SETTINGS */}
          {activeTab === "settings" && (
            <div className="max-w-2xl">
              <Card className="border border-[var(--border)] bg-[var(--card)] shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="size-5 text-[var(--primary)]" />
                    <span>Global Engine Parameters</span>
                  </CardTitle>
                  <CardDescription>Adjust configurations that affect all tenant environments globally.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveAllSettings} className="space-y-6">
                    {/* Rate Limit */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                        Global Call Rate Limit per Sec
                      </label>
                      <Input
                        type="number"
                        value={systemSettings.global_rate_limit}
                        onChange={(e) => setSystemSettings((prev) => ({ ...prev, global_rate_limit: e.target.value }))}
                        placeholder="25"
                        min="1"
                        required
                      />
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        Maximum Concurrent Voice operations routed per system second.
                      </p>
                    </div>

                    {/* Retry Limit */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                        Webhook Deliveries Retry Limit
                      </label>
                      <Input
                        type="number"
                        value={systemSettings.outbound_retry_limit}
                        onChange={(e) => setSystemSettings((prev) => ({ ...prev, outbound_retry_limit: e.target.value }))}
                        placeholder="3"
                        min="0"
                        max="10"
                        required
                      />
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        Attempts before failing webhook alert triggers.
                      </p>
                    </div>

                    {/* Stripe Production Mode */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                        Stripe Payment production live mode
                      </label>
                      <select
                        value={systemSettings.stripe_live_mode}
                        onChange={(e) => setSystemSettings((prev) => ({ ...prev, stripe_live_mode: e.target.value }))}
                        className="w-full h-10 px-3 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-all font-semibold appearance-none cursor-pointer"
                        style={{
                          backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M7 9l3 3 3-3' stroke='%238B8F9E' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                          backgroundPosition: "right 0.75rem center",
                          backgroundSize: "1.25rem",
                          backgroundRepeat: "no-repeat",
                        }}
                      >
                        <option value="false">SANDBOX / DEVELOPMENT ENVIRONMENT</option>
                        <option value="true">LIVE PRODUCTION CHARGES</option>
                      </select>
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        Sets card transactions sandbox validation or active credit card capture.
                      </p>
                    </div>

                    {/* Wallet Bonus */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                        Sign-up Wallet Initial Gift Credit ($)
                      </label>
                      <Input
                        type="text"
                        value={systemSettings.signup_wallet_bonus}
                        onChange={(e) => setSystemSettings((prev) => ({ ...prev, signup_wallet_bonus: e.target.value }))}
                        placeholder="5.00"
                        required
                      />
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        Initial dollar credits given to new tenant directories on registration.
                      </p>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4 border-t border-[var(--border)] flex justify-end">
                      <Button
                        type="submit"
                        disabled={savingSettings}
                        className="bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 font-semibold active:scale-[0.98]"
                      >
                        {savingSettings ? (
                          <>
                            <Loader2 className="size-4 animate-spin mr-2" />
                            Saving Parameters...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="size-4 mr-2" />
                            Commit Reseller Parameters
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* POPUP 1: INSPECT TENANT DIALOG */}
      <Dialog open={showTenantModal} onOpenChange={setShowTenantModal}>
        <DialogContent className="border border-[var(--border)] bg-[var(--card)] sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-[var(--primary)]" />
              <span>Inspect Client Space Details</span>
            </DialogTitle>
            <DialogDescription>
              Telemetry metrics and details for organization workspace.
            </DialogDescription>
          </DialogHeader>

          {selectedTenant && (
            <div className="space-y-4 py-2 text-sm">
              <div className="flex justify-between py-2 border-b border-[var(--border)]">
                <span className="text-[var(--muted-foreground)] font-semibold">Tenant ID</span>
                <span className="font-mono text-xs text-white select-all">{selectedTenant.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border)]">
                <span className="text-[var(--muted-foreground)] font-semibold">Legal Identity</span>
                <span className="font-bold text-white">{selectedTenant.name || "Anonymous Client"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border)]">
                <span className="text-[var(--muted-foreground)] font-semibold">Super Administrator Email</span>
                <span className="font-medium text-white">{selectedTenant.email || "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border)]">
                <span className="text-[var(--muted-foreground)] font-semibold">Phone Support Contact</span>
                <span className="font-medium text-white">{selectedTenant.phone_number || "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border)]">
                <span className="text-[var(--muted-foreground)] font-semibold">Regional Timezone</span>
                <span className="font-medium text-white">{selectedTenant.timezone || "UTC"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border)]">
                <span className="text-[var(--muted-foreground)] font-semibold">Environment Status</span>
                <Badge
                  variant="outline"
                  className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                    selectedTenant.status === "active"
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : "bg-red-500/10 text-red-500 border-red-500/20"
                  }`}
                >
                  {selectedTenant.status}
                </Badge>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[var(--muted-foreground)] font-semibold">Creation Timestamp</span>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {new Date(selectedTenant.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-[var(--border)]">
            <Button onClick={() => setShowTenantModal(false)} className="bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90">
              Close Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POPUP 2: CREATE COUPON DIALOG */}
      <Dialog open={showCouponModal} onOpenChange={setShowCouponModal}>
        <DialogContent className="border border-[var(--border)] bg-[var(--card)] sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="size-5 text-[var(--primary)]" />
              <span>Deploy Wallet Balance Coupon</span>
            </DialogTitle>
            <DialogDescription>
              Deploy balance gifts redeemable by clients in their payment tray.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCoupon} className="space-y-4 pt-2">
            {/* Promo Code */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Promotional Coupon Code
              </label>
              <Input
                type="text"
                value={newCoupon.code}
                onChange={(e) => setNewCoupon((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. WELCOME50"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Promo Value Type
                </label>
                <select
                  value={newCoupon.type}
                  onChange={(e) => setNewCoupon((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full h-10 px-3 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-all font-semibold appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M7 9l3 3 3-3' stroke='%238B8F9E' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundPosition: "right 0.75rem center",
                    backgroundSize: "1.25rem",
                    backgroundRepeat: "no-repeat",
                  }}
                >
                  <option value="fixed">Fixed Balance ($)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </div>

              {/* Value */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Coupon Face Value
                </label>
                <Input
                  type="number"
                  value={newCoupon.value}
                  onChange={(e) => setNewCoupon((prev) => ({ ...prev, value: Number(e.target.value) }))}
                  placeholder="50"
                  min="1"
                  required
                />
              </div>
            </div>

            {/* Max Uses */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Redemption Distribution Limit
              </label>
              <Input
                type="number"
                value={newCoupon.max_uses}
                onChange={(e) => setNewCoupon((prev) => ({ ...prev, max_uses: Number(e.target.value) }))}
                placeholder="100"
                min="1"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Mnemonic Description / Label
              </label>
              <Input
                type="text"
                value={newCoupon.description}
                onChange={(e) => setNewCoupon((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="e.g. Free trial credit code for initial registration"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-[var(--border)]">
              <Button type="button" variant="outline" onClick={() => setShowCouponModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingCoupon}
                className="bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 font-semibold"
              >
                {creatingCoupon ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Deploying...
                  </>
                ) : (
                  "Deploy Promo Coupon"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
