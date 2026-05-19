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
} from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Agents", href: "/agents", icon: Bot },
  { name: "Phone Numbers", href: "/dids", icon: Phone },
  { name: "Knowledge Bases", href: "/knowledge-bases", icon: Database },
  { name: "Calls", href: "/calls", icon: PhoneCall },
  { name: "SMS", href: "/sms", icon: MessageSquare },
  { name: "Webhooks", href: "/webhooks", icon: Webhook },
]

const secondaryNav = [
  { name: "API Keys", href: "/api-keys", icon: Key },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Settings", href: "/settings", icon: Settings },
]

const adminNav = [
  { name: "Admin Panel", href: "/admin", icon: Users },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-[var(--sidebar)]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-[var(--sidebar-border)]">
        <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--primary)]">
          <PhoneCall className="size-5 text-white" />
        </div>
        <div>
          <span className="text-lg font-bold text-white">Call20</span>
          <span className="block text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Voice AI</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-[var(--sidebar-accent)] text-white border-l-2 border-[var(--primary)] ml-[-1px]"
                    : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-white"
                )}
              >
                <item.icon className={cn("size-5", isActive ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")} />
                {item.name}
              </Link>
            )
          })}
        </div>

        {/* Divider */}
        <div className="my-4 h-px bg-[var(--sidebar-border)]" />

        {/* Secondary Navigation */}
        <div className="space-y-1">
          {secondaryNav.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-[var(--sidebar-accent)] text-white border-l-2 border-[var(--primary)] ml-[-1px]"
                    : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-white"
                )}
              >
                <item.icon className={cn("size-5", isActive ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")} />
                {item.name}
              </Link>
            )
          })}
        </div>

        {/* Admin Section */}
        <div className="my-4 h-px bg-[var(--sidebar-border)]" />
        <div className="space-y-1">
          {adminNav.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-[var(--sidebar-accent)] text-white border-l-2 border-[var(--primary)] ml-[-1px]"
                    : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-white"
                )}
              >
                <item.icon className={cn("size-5", isActive ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")} />
                {item.name}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Status Footer */}
      <div className="border-t border-[var(--sidebar-border)] p-4">
        <div className="flex items-center gap-3 rounded-lg bg-[var(--sidebar-accent)] p-3">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-[var(--sidebar-foreground)]">Voice Agent Active</span>
          </div>
          <Activity className="size-4 ml-auto text-[var(--muted-foreground)]" />
        </div>
      </div>
    </div>
  )
}