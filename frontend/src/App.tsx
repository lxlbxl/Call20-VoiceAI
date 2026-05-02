import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'

// Layout
import DashboardLayout from './components/DashboardLayout'

// Pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import AgentsPage from './pages/AgentsPage'
import DIDsPage from './pages/DIDsPage'
import KnowledgeBasesPage from './pages/KnowledgeBasesPage'
import CallsPage from './pages/CallsPage'
import CallDetailPage from './pages/CallDetailPage'
import WebhooksPage from './pages/WebhooksPage'
import SMSPage from './pages/SMSPage'
import APIKeysPage from './pages/APIKeysPage'
import PaymentsPage from './pages/PaymentsPage'
import SettingsPage from './pages/SettingsPage'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminTenantsPage from './pages/admin/AdminTenantsPage'
import AdminTenantDetailPage from './pages/admin/AdminTenantDetailPage'
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import AdminCouponsPage from './pages/admin/AdminCouponsPage'

// Auth guard
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const token = localStorage.getItem('access_token')
    if (!token) return <Navigate to="/login" replace />
    return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
    const token = localStorage.getItem('admin_token')
    if (!token) return <Navigate to="/admin/login" replace />
    return <>{children}</>
}

export default function App() {
    return (
        <>
            <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/admin/login" element={<AdminLoginPage />} />

                {/* Tenant routes */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<DashboardPage />} />
                    <Route path="agents" element={<AgentsPage />} />
                    <Route path="dids" element={<DIDsPage />} />
                    <Route path="knowledge-bases" element={<KnowledgeBasesPage />} />
                    <Route path="calls" element={<CallsPage />} />
                    <Route path="calls/:callId" element={<CallDetailPage />} />
                    <Route path="webhooks" element={<WebhooksPage />} />
                    <Route path="sms" element={<SMSPage />} />
                    <Route path="api-keys" element={<APIKeysPage />} />
                    <Route path="payments" element={<PaymentsPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                </Route>

                {/* Admin routes */}
                <Route
                    path="/admin"
                    element={
                        <AdminRoute>
                            <Navigate to="/admin/dashboard" replace />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/admin/dashboard"
                    element={
                        <AdminRoute>
                            <AdminDashboardPage />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/admin/tenants"
                    element={
                        <AdminRoute>
                            <AdminTenantsPage />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/admin/tenants/:tenantId"
                    element={
                        <AdminRoute>
                            <AdminTenantDetailPage />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/admin/audit-logs"
                    element={
                        <AdminRoute>
                            <AdminAuditLogsPage />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/admin/settings"
                    element={
                        <AdminRoute>
                            <AdminSettingsPage />
                        </AdminRoute>
                    }
                />
                <Route
                    path="/admin/coupons"
                    element={
                        <AdminRoute>
                            <AdminCouponsPage />
                        </AdminRoute>
                    }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster position="top-right" />
        </>
    )
}