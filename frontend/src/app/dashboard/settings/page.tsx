"use client"

import { useState, useEffect, FormEvent } from "react"
import { api, Tenant, User } from "@/lib/api"
import { toast } from "sonner"
import {
  Settings as SettingsIcon,
  Users,
  Mail,
  Building2,
  Clock,
  Phone,
  Plus,
  Trash2,
  Loader2,
  UserPlus,
  Shield,
  Save,
  UserCheck
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

const timezones = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "Africa/Lagos", label: "Africa/Lagos (West Africa Time - GMT+1)" },
  { value: "Africa/Johannesburg", label: "Africa/Johannesburg (South Africa Standard Time - GMT+2)" },
  { value: "Europe/London", label: "Europe/London (Greenwich Mean Time - GMT)" },
  { value: "Europe/Paris", label: "Europe/Paris (Central European Time - GMT+1)" },
  { value: "America/New_York", label: "America/New_York (Eastern Time - GMT-5)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (Pacific Time - GMT-8)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (Japan Standard Time - GMT+9)" },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"company" | "team">("company")
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [users, setUsers] = useState<User[]>([])
  
  // Loading states
  const [loadingTenant, setLoadingTenant] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [savingCompany, setSavingCompany] = useState(false)
  const [inviting, setInviting] = useState(false)

  // Edit Company fields
  const [companyName, setCompanyName] = useState("")
  const [supportEmail, setSupportEmail] = useState("")
  const [companyPhone, setCompanyPhone] = useState("")
  const [companyTimezone, setCompanyTimezone] = useState("UTC")

  // Invite user fields
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")

  const fetchTenantDetails = async () => {
    try {
      setLoadingTenant(true)
      const res = await api.tenants.get()
      setTenant(res.data)
      setCompanyName(res.data.name || "")
      setSupportEmail(res.data.email || "")
      setCompanyPhone(res.data.phone_number || "")
      setCompanyTimezone(res.data.timezone || "UTC")
    } catch {
      toast.error("Failed to load company settings")
    } finally {
      setLoadingTenant(false)
    }
  }

  const fetchTeamUsers = async () => {
    try {
      setLoadingUsers(true)
      const res = await api.tenants.listUsers()
      setUsers(res.data)
    } catch {
      toast.error("Failed to fetch team directories")
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    fetchTenantDetails()
    fetchTeamUsers()
  }, [])

  const handleSaveCompany = async (e: FormEvent) => {
    e.preventDefault()
    if (!companyName.trim()) {
      toast.error("Company Name is required")
      return
    }
    setSavingCompany(true)
    try {
      await api.tenants.update({
        name: companyName,
        email: supportEmail,
        phone_number: companyPhone,
        timezone: companyTimezone,
      })
      toast.success("Company profile updated successfully")
      fetchTenantDetails()
    } catch {
      toast.error("Failed to update settings")
    } finally {
      setSavingCompany(false)
    }
  }

  const handleInviteUser = async (e: FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) {
      toast.error("Email address is required")
      return
    }
    setInviting(true)
    try {
      await api.tenants.inviteUser({
        email: inviteEmail,
        role: inviteRole,
      })
      toast.success(`Invitation sent to ${inviteEmail}`)
      setInviteEmail("")
      fetchTeamUsers()
    } catch {
      toast.error("Failed to invite team member")
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from your company team directory?`)) return
    try {
      await api.tenants.removeUser(userId)
      toast.success("Team member removed successfully")
      fetchTeamUsers()
    } catch {
      toast.error("Failed to remove team member")
    }
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Settings</h1>
        <p className="text-[var(--muted-foreground)] mt-1">
          Manage your enterprise organization identity, regional settings, and team access credentials.
        </p>
      </div>

      {/* Tabs Selector Bar */}
      <div className="flex border-b border-[var(--border)] gap-6">
        <button
          onClick={() => setActiveTab("company")}
          className={`flex items-center gap-2 pb-3.5 text-sm font-semibold tracking-wide transition-all border-b-2 outline-none ${
            activeTab === "company"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <Building2 className="size-4" />
          Company Profile
        </button>
        <button
          onClick={() => setActiveTab("team")}
          className={`flex items-center gap-2 pb-3.5 text-sm font-semibold tracking-wide transition-all border-b-2 outline-none ${
            activeTab === "team"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <Users className="size-4" />
          Team Members
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "company" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Details Form (Col Span 2) */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border border-[var(--border)] bg-[var(--card)] shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="size-5 text-[var(--primary)]" />
                  <span>General Information</span>
                </CardTitle>
                <CardDescription>
                  Review and customize company details to be displayed on outbound materials.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTenant ? (
                  <div className="space-y-4 py-4">
                    <div className="h-10 bg-[var(--muted)] animate-shimmer rounded" />
                    <div className="h-10 bg-[var(--muted)] animate-shimmer rounded" />
                    <div className="h-10 bg-[var(--muted)] animate-shimmer rounded" />
                  </div>
                ) : (
                  <form onSubmit={handleSaveCompany} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                          Company Legal Name
                        </label>
                        <Input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g. Call20 Reselling Corp"
                          required
                        />
                      </div>

                      {/* Phone */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                          Support Phone Number
                        </label>
                        <Input
                          type="text"
                          value={companyPhone}
                          onChange={(e) => setCompanyPhone(e.target.value)}
                          placeholder="e.g. +234 800 CALL 20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Email */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                          Support Email Address
                        </label>
                        <Input
                          type="email"
                          value={supportEmail}
                          onChange={(e) => setSupportEmail(e.target.value)}
                          placeholder="e.g. hello@call20.com"
                        />
                      </div>

                      {/* Timezone */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                          Global System Timezone
                        </label>
                        <select
                          value={companyTimezone}
                          onChange={(e) => setCompanyTimezone(e.target.value)}
                          className="w-full h-10 px-3 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all font-medium appearance-none cursor-pointer"
                          style={{
                            backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M7 9l3 3 3-3' stroke='%238B8F9E' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                            backgroundPosition: "right 0.75rem center",
                            backgroundSize: "1.25rem",
                            backgroundRepeat: "no-repeat",
                          }}
                        >
                          {timezones.map((tz) => (
                            <option key={tz.value} value={tz.value} className="bg-[var(--card)] text-[var(--foreground)]">
                              {tz.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[var(--border)] flex justify-end">
                      <Button
                        type="submit"
                        disabled={savingCompany}
                        className="bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 font-semibold active:scale-[0.98]"
                      >
                        {savingCompany ? (
                          <>
                            <Loader2 className="size-4 animate-spin mr-2" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save className="size-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats sidebar (Col Span 1) */}
          <div className="space-y-6">
            <Card className="border border-[var(--border)] bg-[var(--card)] shadow-md overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-500" />
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Metadata Summary</CardTitle>
                <CardDescription>Current company directory context</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm py-2.5 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                    <Building2 className="size-4" />
                    <span>Company ID</span>
                  </div>
                  <span className="font-mono text-xs text-white max-w-[120px] truncate select-all" title={tenant?.id}>
                    {tenant?.id || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm py-2.5 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                    <Clock className="size-4" />
                    <span>Active Zone</span>
                  </div>
                  <span className="font-medium text-white text-xs">{tenant?.timezone || "UTC"}</span>
                </div>

                <div className="flex items-center justify-between text-sm py-2.5 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                    <Phone className="size-4" />
                    <span>Contact Phone</span>
                  </div>
                  <span className="font-medium text-white text-xs">{tenant?.phone_number || "—"}</span>
                </div>

                <div className="flex items-center justify-between text-sm py-2.5">
                  <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                    <UserCheck className="size-4" />
                    <span>User Count</span>
                  </div>
                  <Badge variant="outline" className="text-xs bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20 font-semibold px-2 py-0.5">
                    {users.length} {users.length === 1 ? "user" : "users"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Active Users directory table (Col Span 2) */}
          <div className="md:col-span-2">
            <Card className="border border-[var(--border)] bg-[var(--card)] shadow-md">
              <CardHeader>
                <CardTitle>Team Directory</CardTitle>
                <CardDescription>
                  List of professionals configured with access to this dashboard space.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loadingUsers ? (
                  <div className="p-6 space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-14 bg-[var(--muted)] animate-shimmer rounded" />
                    ))}
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <Users className="size-12 mx-auto text-[var(--muted-foreground)] mb-4 animate-pulse-glow" />
                    <h3 className="font-semibold text-lg mb-1">Empty Directory</h3>
                    <p className="text-sm text-[var(--muted-foreground)] max-w-sm mx-auto">
                      No users configured for this space. Recruit new professionals using the invitation tray.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30 text-[var(--muted-foreground)] font-medium">
                          <th className="text-left p-4">Email / Name</th>
                          <th className="text-left p-4">Permission Role</th>
                          <th className="text-right p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u, idx) => (
                          <tr
                            key={u.id || idx}
                            className="border-b border-[var(--border)] hover:bg-[var(--muted)]/20 transition-colors animate-fade-in"
                            style={{ animationDelay: `${idx * 40}ms` }}
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="flex size-9 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-bold text-xs uppercase">
                                  {u.email ? u.email.substring(0, 2) : "US"}
                                </div>
                                <div>
                                  <p className="font-semibold text-[var(--foreground)]">{u.email}</p>
                                  <p className="text-[10px] text-[var(--muted-foreground)] font-mono">ID: {u.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                  u.role === "admin"
                                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                                    : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                }`}
                              >
                                <Shield className="size-3 mr-1 inline-block" />
                                {u.role}
                              </Badge>
                            </td>
                            <td className="p-4 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveUser(u.id, u.email)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                title="Revoke team access"
                                disabled={users.length <= 1} // Prevent removing the last user
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

          {/* Invitation Side Panel (Col Span 1) */}
          <div>
            <Card className="border border-[var(--border)] bg-[var(--card)] shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-[var(--primary)]" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="size-5 text-[var(--primary)]" />
                  <span>Invite Member</span>
                </CardTitle>
                <CardDescription>
                  Recruit new administrators or team members into this organization workspace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInviteUser} className="space-y-4">
                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Recipient Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 size-4 text-[var(--muted-foreground)]" />
                      <Input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="e.g. colleague@call20.com"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Role Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Dashboard Access Role
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full h-10 px-3 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all font-medium appearance-none cursor-pointer"
                      style={{
                        backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M7 9l3 3 3-3' stroke='%238B8F9E' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                        backgroundPosition: "right 0.75rem center",
                        backgroundSize: "1.25rem",
                        backgroundRepeat: "no-repeat",
                      }}
                    >
                      <option value="member" className="bg-[var(--card)] text-[var(--foreground)]">
                        MEMBER — Standard Operator
                      </option>
                      <option value="admin" className="bg-[var(--card)] text-[var(--foreground)]">
                        ADMIN — Full Organization Control
                      </option>
                    </select>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={inviting}
                      className="w-full bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 font-semibold active:scale-[0.98]"
                    >
                      {inviting ? (
                        <>
                          <Loader2 className="size-4 animate-spin mr-2" />
                          Sending invite...
                        </>
                      ) : (
                        <>
                          <Plus className="size-4 mr-2" />
                          Send Invitation
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
