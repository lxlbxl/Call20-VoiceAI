"use client"

import * as React from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { BottomNav } from "@/components/layout/BottomNav"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { useTheme } from "@/lib/theme"
import { useAuth } from "@/lib/auth"
import { Sun, Moon, LogOut } from "lucide-react"
import Link from "next/link"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { theme, toggleTheme } = useTheme()
  const { logout } = useAuth()

  const BrandLogo = () => (
    <svg className="size-6" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" stroke="#FF4D2E" strokeWidth="8" />
      <path d="M40 30V70" stroke="#FF4D2E" strokeWidth="8" strokeLinecap="round" />
      <path d="M60 30V60L52 68" stroke="#FF4D2E" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M52 68H68" stroke="#FF4D2E" strokeWidth="8" strokeLinecap="round" />
    </svg>
  )

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[var(--background)] flex flex-col md:block text-[var(--foreground)]">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Mobile Top Header */}
        <header className="flex h-14 items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--card)] md:hidden sticky top-0 z-40">
          <Link href="/dashboard" className="flex items-center gap-2">
            <BrandLogo />
            <div className="flex items-baseline font-bold text-[var(--foreground)] text-base tracking-tight">
              <span>call</span>
              <span className="text-[var(--primary)] font-extrabold ml-0.5">20</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="flex size-8 items-center justify-center rounded-lg bg-[var(--muted)] text-[var(--foreground)] transition-all active:scale-95"
              aria-label="Toggle Theme"
            >
              {theme === "light" ? (
                <Moon className="size-4 text-[var(--primary)]" />
              ) : (
                <Sun className="size-4 text-[var(--primary)]" />
              )}
            </button>
            <button
              onClick={logout}
              className="flex size-8 items-center justify-center rounded-lg bg-red-950/20 text-red-500 hover:bg-red-950/40 transition-colors active:scale-95"
              title="Logout"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 md:pl-[260px] pb-16 md:pb-0 transition-all duration-300 min-h-screen">
          <div className="min-h-screen flex flex-col">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>
    </AuthGuard>
  )
}