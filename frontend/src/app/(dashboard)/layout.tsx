"use client"

import * as React from "react"
import { Sidebar } from "@/components/layout/Sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Sidebar />
      <main className="pl-[260px]">
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  )
}