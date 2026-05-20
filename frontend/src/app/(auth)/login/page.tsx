"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, ShieldCheck, Cpu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { apiClient } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await apiClient.post("/auth/login", { email, password })
      const { access_token } = response.data

      localStorage.setItem("access_token", access_token)

      // Decode token to store user info in localStorage for useAuth
      const payload = JSON.parse(atob(access_token.split(".")[1]))
      const userData = {
        id: payload.sub,
        email,
        tenant_id: payload.tenant_id,
        role: payload.role,
      }
      localStorage.setItem("user", JSON.stringify(userData))

      router.push("/dashboard")
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed. Please check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  // Elegant SVG Logo lockup matching the brand guidelines image
  const BrandLogo = () => (
    <svg className="size-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" stroke="#FF4D2E" strokeWidth="9" />
      <path d="M40 30V70" stroke="#FF4D2E" strokeWidth="9" strokeLinecap="round" />
      <path d="M60 30V60L52 68" stroke="#FF4D2E" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M52 68H68" stroke="#FF4D2E" strokeWidth="9" strokeLinecap="round" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Brand Gradient Background Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--primary)/8_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--primary)]/20 to-transparent pointer-events-none" />

      <div className="w-full max-w-md animate-slide-up z-10 space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-2 mb-2">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-md transition-transform duration-300 hover:scale-105">
            <BrandLogo />
          </div>
          <div>
            <div className="flex items-baseline justify-center font-bold text-2xl tracking-tight">
              <span>call</span>
              <span className="text-[var(--primary)] font-extrabold ml-0.5">20</span>
            </div>
            <span className="block text-[10px] text-[var(--muted-foreground)] uppercase tracking-widest font-semibold mt-0.5">Voice AI reseller platform</span>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-2xl relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-2 h-full bg-[var(--primary)]" />
          <CardHeader className="text-center pb-2 pl-8">
            <CardTitle className="text-2xl font-bold tracking-tight">Welcome Back</CardTitle>
            <CardDescription className="text-sm text-[var(--muted-foreground)]">
              Sign in to manage your voice agent resell network
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-8">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-950/20 border border-red-900/30 text-red-500 text-sm flex items-center gap-2">
                  <ShieldCheck className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Email Address</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[var(--background)]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Password</label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your security password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-[var(--background)] pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 transition-all font-semibold active:scale-[0.98]" size="lg" disabled={loading}>
                {loading ? "Verifying Credentials..." : "Sign In to Console"}
              </Button>
            </form>

            <div className="mt-6 text-center text-xs text-[var(--muted-foreground)] border-t border-[var(--border)] pt-4">
              <span>Don&apos;t have an reseller account?</span>{" "}
              <a href="/register" className="text-[var(--primary)] hover:underline font-bold transition-all">
                Register tenant organization
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider font-medium text-center">
          <Cpu className="size-3 text-[var(--primary)]" />
          <span>Call20 African Fintech Reseller Infrastructure</span>
        </div>
      </div>
    </div>
  )
}