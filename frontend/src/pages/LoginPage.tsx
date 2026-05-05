import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '@/client/api'
import { toast } from 'sonner'
import { Phone } from 'lucide-react'

export default function LoginPage() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!email || !password) {
            toast.error('Please fill in all fields')
            return
        }
        setLoading(true)
        try {
            const res = await authApi.login({ email, password })
            localStorage.setItem('access_token', res.data.access_token)
            localStorage.setItem('refresh_token', res.data.refresh_token)
            toast.success('Logged in successfully')
            navigate('/')
        } catch (err: unknown) {
            const error = err as { response?: { data?: { detail?: string } } }
            toast.error(error.response?.data?.detail || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-sm border">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4">
                        <Phone className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">Call20</h1>
                    <p className="text-gray-500 mt-1">Sign in to your account</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input w-full"
                            placeholder="you@company.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input w-full"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full disabled:opacity-50"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
                <p className="text-center text-sm text-gray-500 mt-6">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-primary font-medium hover:underline">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    )
}
