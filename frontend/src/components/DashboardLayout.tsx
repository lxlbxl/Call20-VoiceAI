import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
    Phone,
    Users,
    Database,
    MessageSquare,
    Webhook,
    Key,
    CreditCard,
    Settings,
    LogOut,
    Menu,
    X,
    BarChart3,
    Headphones,
    Smartphone,
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart3 },
    { name: 'Agents', href: '/agents', icon: Headphones },
    { name: 'Phone Numbers', href: '/dids', icon: Phone },
    { name: 'Knowledge Base', href: '/knowledge-bases', icon: Database },
    { name: 'Calls', href: '/calls', icon: Users },
    { name: 'SMS', href: '/sms', icon: MessageSquare },
    { name: 'Webhooks', href: '/webhooks', icon: Webhook },
    { name: 'API Keys', href: '/api-keys', icon: Key },
    { name: 'Payments', href: '/payments', icon: CreditCard },
    { name: 'Settings', href: '/settings', icon: Settings },
]

export default function DashboardLayout() {
    const location = useLocation()
    const navigate = useNavigate()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleLogout = () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        navigate('/login')
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <Phone className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-bold">Call20</span>
                    </Link>
                    <button
                        className="lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.name}
                            </Link>
                        )
                    })}

                    <div className="pt-4 mt-4 border-t border-gray-200">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            Logout
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Main content */}
            <div className="lg:ml-64">
                {/* Top bar */}
                <header className="sticky top-0 z-30 bg-white border-b border-gray-200 h-16 flex items-center px-4 gap-4">
                    <button
                        className="lg:hidden"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex-1" />
                    <Link
                        to="/admin/dashboard"
                        className="text-sm text-gray-500 hover:text-gray-700"
                    >
                        Admin Panel
                    </Link>
                </header>

                {/* Page content */}
                <main className="p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}