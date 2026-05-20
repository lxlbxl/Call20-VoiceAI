"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Bot, PhoneCall, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Agents", href: "/dashboard/agents", icon: Bot },
  { name: "Calls", href: "/dashboard/calls", icon: PhoneCall },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--card)] px-4 py-2 md:hidden">
      <div className="flex items-center justify-around">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-3 text-[10px] font-medium transition-all duration-150 rounded-lg",
                isActive
                  ? "text-[var(--primary)] scale-105"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              <item.icon className={cn("size-5 mb-0.5", isActive ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")} />
              {item.name}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
