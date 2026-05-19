"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("access_token")

      if (!token) {
        router.push("/login")
        setIsAuthenticated(false)
      } else {
        setIsAuthenticated(true)
      }
      setChecking(false)
    }

    checkAuth()
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}