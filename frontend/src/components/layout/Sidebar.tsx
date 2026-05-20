"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Bot,
  Phone,
  Database,
  PhoneCall,
  MessageSquare,
  Webhook,
  Key,
  Settings,
  Users,
  CreditCard,
  Activity,
  Sun,
  Moon,
  LogOut
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/lib/theme"
import { useAuth } from "@/lib/auth"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Agents", href: "/dashboard/agents", icon: Bot },
  { name: "Phone Numbers", href: "/dashboard/dids", icon: Phone },
  { name: "Knowledge Bases", href: "/dashboard/knowledge-bases", icon: Database },
  { name: "Calls", href: "/dashboard/calls", icon: PhoneCall },
  { name: "SMS", href: "/dashboard/sms", icon: MessageSquare },
  { name: "Webhooks", href: "/dashboard/webhooks", icon: Webhook },
]

const secondaryNav = [
  { name: "API Keys", href: "/dashboard/api-keys", icon: Key },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

const adminNav = [
  { name: "Admin Panel", href: "/dashboard/admin", icon: Users },
]

export function Sidebar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()

  // Elegant Brand Logo SVG matching the brand guidelines image
  const BrandLogo = () => (
    <svg className="size-8" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" stroke="#FF4D2E" strokeWidth="8" />
      <path d="M40 30V70" stroke="#FF4D2E" strokeWidth="8" strokeLinecap="round" />
      <path d="M60 30V60L52 68" stroke="#FF4D2E" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M52 68H68" stroke="#FF4D2E" strokeWidth="8" strokeLinecap="round" />
    </svg>
  )

  return (
    <div className="fixed inset-y-0 left-0 z-50 hidden w-[260px] flex-col bg-[var(--sidebar)] md:flex border-r border-[var(--sidebar-border)]">
      {/* Top Brand Header */}
      <div className="flex h-16 items-center justify-between gap-2 px-6 border-b border-[var(--sidebar-border)] bg-[var(--sidebar)]">
        <Link href="/" className="flex items-center gap-3">
          <BrandLogo />
          <div>
            <div className="flex items-baseline font-bold text-white text-xl tracking-tight">
              <span>call</span>
              <span className="text-[var(--primary)] font-extrabold ml-0.5">20</span>
            </div>
            <span className="block text-[9px] text-[var(--muted-foreground)] uppercase tracking-widest font-medium">Voice AI reseller</span>
          </div>
        </Link>
        <button
          onClick={toggleTheme}
          className="flex size-8 items-center justify-center rounded-lg bg-[var(--sidebar-accent)] text-[var(--sidebar-foreground)] hover:text-white transition-all duration-200 active:scale-95"
          aria-label="Toggle Theme"
        >
          {theme === "light" ? (
            <Moon className="size-4 text-[var(--primary)] animate-pulse" />
          ) : (
            <Sun className="size-4 text-[var(--primary)] animate-spin-slow" />
          )}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--sidebar-accent)]">
        <div className="space-y-1">
          <span className="px-3 text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Main Menu</span>
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 group",
                  isActive
                    ? "bg-[var(--sidebar-accent)] text-white border-l-2 border-[var(--primary)] pl-[10px]"
                    : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-white"
                )}
              >
                <item.icon className={cn("size-5 transition-transform duration-200 group-hover:scale-110", isActive ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")} />
                {item.name}
              </Link>
            )
          })}
        </div>

        {/* Secondary Section */}
        <div className="pt-6 space-y-1">
          <span className="px-3 text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Developer & Wallet</span>
          {secondaryNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 group",
                  isActive
                    ? "bg-[var(--sidebar-accent)] text-white border-l-2 border-[var(--primary)] pl-[10px]"
                    : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-white"
                )}
              >
                <item.icon className={cn("size-5 transition-transform duration-200 group-hover:scale-110", isActive ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")} />
                {item.name}
              </Link>
            )
          })}
        </div>

        {/* Reseller Admin Section */}
        {user?.role === "admin" && (
          <div className="pt-6 space-y-1">
            <span className="px-3 text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Administration</span>
            {adminNav.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 group",
                    isActive
                      ? "bg-[var(--sidebar-accent)] text-white border-l-2 border-[var(--primary)] pl-[10px]"
                      : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-white"
                  )}
                >
                  <item.icon className={cn("size-5 transition-transform duration-200 group-hover:scale-110", isActive ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")} />
                  {item.name}
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* User Session & Status Footer */}
      <div className="border-t border-[var(--sidebar-border)] bg-[var(--sidebar)] p-4 space-y-3">
        {/* Connection Status indicator */}
        <div className="flex items-center justify-between rounded-lg bg-[var(--sidebar-accent)] px-3 py-2 border border-[var(--sidebar-border)]">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-[var(--primary)] animate-pulse" />
            <span className="text-[11px] font-medium text-[var(--sidebar-foreground)]">System Ready</span>
          </div>
          <Activity className="size-3 text-[var(--primary)]" />
        </div>

        {/* User Info / Logout */}
        {user && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--sidebar-border)]">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{user.email}</p>
              <p className="truncate text-[10px] text-[var(--muted-foreground)] capitalize">{user.role}</p>
            </div>
            <button
              onClick={logout}
              className="flex size-7 items-center justify-center rounded bg-red-950/30 text-red-400 hover:bg-red-950 hover:text-red-300 transition-colors border border-red-900/30 active:scale-95"
              title="Logout"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}