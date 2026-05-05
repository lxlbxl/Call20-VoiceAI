import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

export const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor: attach token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Response interceptor: handle 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authApi = {
    login: (data: { email: string; password: string }) =>
        api.post('/auth/login', data),
    register: (data: { email: string; password: string; tenant_name: string }) =>
        api.post('/auth/register', data),
    verifyEmail: (token: string) =>
        api.post(`/auth/verify-email?token=${token}`),
    refreshToken: (refresh_token: string) =>
        api.post('/auth/refresh', { refresh_token }),
    me: () => api.get('/auth/me'),
}

// ── Tenants API ───────────────────────────────────────────────────────────────

export const tenantsApi = {
    get: () => api.get('/tenants/'),
    update: (data: { name?: string; timezone?: string; phone_number?: string; business_type?: string }) =>
        api.patch('/tenants/', data),
    inviteUser: (data: { email: string; role: string }) =>
        api.post('/tenants/invite', data),
    removeUser: (userId: string) =>
        api.delete(`/tenants/users/${userId}`),
    listUsers: () => api.get('/tenants/users'),
}

// ── Agents API ────────────────────────────────────────────────────────────────

export const agentsApi = {
    get: () => api.get('/agents'),
    create: (data: { name: string; language: string; voice: string; system_prompt: string; knowledge_base_id?: string }) =>
        api.post('/agents', data),
    update: (agentId: string, data: Record<string, unknown>) =>
        api.patch(`/agents/${agentId}`, data),
    delete: (agentId: string) =>
        api.delete(`/agents/${agentId}`),
}

// ── DIDs API ──────────────────────────────────────────────────────────────────

export const didsApi = {
    list: () => api.get('/dids'),
    provision: (data: { country_code: string; number_type?: string }) =>
        api.post('/dids/provision', data),
    release: (didId: string) =>
        api.delete(`/dids/${didId}`),
}

// ── Knowledge Bases API ───────────────────────────────────────────────────────

export const kbApi = {
    list: () => api.get('/knowledge-bases'),
    create: (data: { name: string; source_type: string; source_url?: string; content?: string }) =>
        api.post('/knowledge-bases', data),
    delete: (kbId: string) =>
        api.delete(`/knowledge-bases/${kbId}`),
    status: (kbId: string) =>
        api.get(`/knowledge-bases/${kbId}/status`),
}

// ── Calls API ─────────────────────────────────────────────────────────────────

export const callsApi = {
    list: (params?: { status?: string; limit?: number; offset?: number }) =>
        api.get('/calls', { params }),
    get: (callId: string) =>
        api.get(`/calls/${callId}`),
    transcript: (callId: string) =>
        api.get(`/calls/${callId}/transcript`),
    recording: (callId: string) =>
        api.get(`/calls/${callId}/recording`),
    analytics: (params?: { start_date?: string; end_date?: string }) =>
        api.get('/calls/analytics', { params }),
}

// ── Webhooks API ──────────────────────────────────────────────────────────────

export const webhooksApi = {
    list: () => api.get('/webhooks'),
    create: (data: { url: string; events?: string[]; secret?: string }) =>
        api.post('/webhooks', data),
    update: (webhookId: string, data: Record<string, unknown>) =>
        api.patch(`/webhooks/${webhookId}`, data),
    delete: (webhookId: string) =>
        api.delete(`/webhooks/${webhookId}`),
    test: (webhookId: string) =>
        api.post(`/webhooks/${webhookId}/test`),
}

// ── SMS API ───────────────────────────────────────────────────────────────────

export const smsApi = {
    list: (params?: { limit?: number; offset?: number }) =>
        api.get('/sms', { params }),
    send: (data: { to: string; message: string }) =>
        api.post('/sms/send', data),
}

// ── API Keys API ──────────────────────────────────────────────────────────────

export const apiKeysApi = {
    list: () => api.get('/api-keys'),
    create: (data: { name: string; permissions?: string[] }) =>
        api.post('/api-keys', data),
    revoke: (keyId: string) =>
        api.delete(`/api-keys/${keyId}`),
}

// ── Payments API ──────────────────────────────────────────────────────────────

export const paymentsApi = {
    wallet: () => api.get('/payments/wallet'),
    topup: (data: { amount: number; provider: string; currency?: string }) =>
        api.post('/payments/topup', data),
    topupCallback: (provider: string, data: Record<string, unknown>) =>
        api.post(`/payments/callback/${provider}`, data),
    transactions: (params?: { limit?: number; offset?: number }) =>
        api.get('/payments/transactions', { params }),
    redeemCoupon: (data: { code: string }) =>
        api.post('/payments/redeem-coupon', data),
}

// ── Admin API ─────────────────────────────────────────────────────────────────

export const adminApi = {
    login: (data: { username: string; password: string }) =>
        api.post('/admin/login', data),
    dashboard: () => api.get('/admin/dashboard'),
    tenants: (params?: { status?: string; search?: string; page?: number; page_size?: number }) =>
        api.get('/admin/tenants', { params }),
    tenantDetail: (tenantId: string) =>
        api.get(`/admin/tenants/${tenantId}`),
    tenantAction: (tenantId: string, action: string) =>
        api.post(`/admin/tenants/${tenantId}/action`, { action }),
    auditLogs: (params?: { action?: string; tenant_id?: string; page?: number; page_size?: number }) =>
        api.get('/admin/audit-logs', { params }),
    settings: () => api.get('/admin/settings'),
    updateSetting: (key: string, value: string) =>
        api.put(`/admin/settings/${key}`, { value }),
    coupons: () => api.get('/admin/coupons'),
    createCoupon: (data: { code: string; type: string; value: number; max_uses?: number; expires_at?: string; description?: string }) =>
        api.post('/admin/coupons', data),
    updateCoupon: (couponId: string, data: Record<string, unknown>) =>
        api.patch(`/admin/coupons/${couponId}`, data),
    deleteCoupon: (couponId: string) =>
        api.delete(`/admin/coupons/${couponId}`),
}