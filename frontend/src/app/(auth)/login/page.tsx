"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PhoneCall, Eye, EyeOff } from "lucide-react"
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

      router.push("/")
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed. Please check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--primary)/5_0%,transparent_50%)] pointer-events-none" />

      <div className="w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--primary)]">
            <PhoneCall className="size-6 text-white" />
          </div>
          <div>
            <span className="text-2xl font-bold">Call20</span>
            <span className="block text-xs text-[var(--muted-foreground)] uppercase tracking-wider">Voice AI Platform</span>
          </div>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to manage your voice agents</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-[var(--muted-foreground)]">Don&apos;t have an account?</span>{" "}
              <a href="/register" className="text-[var(--primary)] hover:underline font-medium">
                Create one
              </a>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[var(--muted-foreground)] mt-6">
          Voice AI Platform for African Businesses
        </p>
      </div>
    </div>
  )
}