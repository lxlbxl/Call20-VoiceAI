import axios from "axios"

const getApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    return window.location.origin + "/api/v1"
  }
  return process.env.API_URL || "/api/v1"
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
})

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token")
        localStorage.removeItem("user")
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

// ── Interfaces ───────────────────────────────────────────────────────────────

export interface Agent {
  id: string
  name: string
  voice_type: string
  status: "active" | "inactive"
  call_count: number
  created_at: string
  greeting?: string
  language?: string
  voice?: string
  system_prompt?: string
  knowledge_base_id?: string
}

export interface DID {
  id: string
  phone_number: string
  country_code: string
  number_type?: string
  status: "active" | "inactive"
  monthly_cost: number
  created_at: string
  agent_id?: string
}

export interface Call {
  id: string
  caller: string
  called: string
  duration: number
  status: "completed" | "missed" | "failed"
  sentiment?: "positive" | "neutral" | "negative"
  disposition?: string
  recording_url?: string
  created_at: string
}

export interface WalletBalance {
  balance: number
  currency: string
}

export interface KnowledgeBase {
  id: string
  name: string
  source_type: string
  source_url?: string
  content?: string
  status: string
  chunk_count?: number
  created_at: string
}

export interface SMSMessage {
  id: string
  to: string
  message: string
  status: string
  created_at: string
}

export interface Webhook {
  id: string
  url: string
  events?: string[]
  secret?: string
  status?: string
  created_at: string
}

export interface APIKey {
  id: string
  name: string
  key?: string
  masked_key?: string
  permissions?: string[]
  created_at: string
}

export interface Tenant {
  id: string
  name: string
  email: string
  phone_number?: string
  timezone?: string
  status: string
  created_at: string
}

export interface User {
  id: string
  email: string
  role: string
  created_at: string
}

export interface Transaction {
  id: string
  amount: number
  type: string
  provider: string
  status: string
  currency: string
  description?: string
  created_at: string
}

export interface AuditLog {
  id: string
  action: string
  tenant_id?: string
  details?: string
  created_at: string
  user_email?: string
}

export interface Coupon {
  id: string
  code: string
  type: string
  value: number
  max_uses?: number
  uses_count?: number
  expires_at?: string
  description?: string
  created_at: string
}

// ── API Definitions ──────────────────────────────────────────────────────────

export const api = {
  auth: {
    login: (data: any) => apiClient.post("/auth/login", data),
    register: (data: any) => apiClient.post("/auth/register", data),
    verifyEmail: (token: string) => apiClient.post(`/auth/verify-email?token=${token}`),
    me: () => apiClient.get("/auth/me"),
  },
  tenants: {
    get: () => apiClient.get<Tenant>("/tenants/"),
    update: (data: Partial<Tenant>) => apiClient.patch<Tenant>("/tenants/", data),
    listUsers: () => apiClient.get<User[]>("/tenants/users"),
    inviteUser: (data: { email: string; role: string }) => apiClient.post("/tenants/invite", data),
    removeUser: (userId: string) => apiClient.delete(`/tenants/users/${userId}`),
  },
  agents: {
    list: () => apiClient.get<Agent[]>("/agents"),
    get: (id: string) => apiClient.get<Agent>(`/agents/${id}`),
    create: (data: Partial<Agent>) => apiClient.post<Agent>("/agents", data),
    update: (id: string, data: Partial<Agent>) => apiClient.patch<Agent>(`/agents/${id}`, data),
    delete: (id: string) => apiClient.delete(`/agents/${id}`),
  },
  dids: {
    list: () => apiClient.get<DID[]>("/dids"),
    provision: (data: { country_code: string; number_type?: string }) =>
      apiClient.post<DID>("/dids/provision", data),
    release: (id: string) => apiClient.delete(`/dids/${id}`),
  },
  knowledgeBases: {
    list: () => apiClient.get<KnowledgeBase[]>("/knowledge-bases"),
    create: (data: Partial<KnowledgeBase>) => apiClient.post<KnowledgeBase>("/knowledge-bases", data),
    delete: (id: string) => apiClient.delete(`/knowledge-bases/${id}`),
    status: (id: string) => apiClient.get(`/knowledge-bases/${id}/status`),
  },
  calls: {
    list: (params?: { status?: string; limit?: number; offset?: number }) =>
      apiClient.get<{ calls: Call[]; total: number }>("/calls", { params }),
    get: (id: string) => apiClient.get<Call>(`/calls/${id}`),
    transcript: (id: string) => apiClient.get(`/calls/${id}/transcript`),
    recording: (id: string) => apiClient.get(`/calls/${id}/recording`),
    analytics: (params?: { start_date?: string; end_date?: string }) =>
      apiClient.get("/calls/analytics", { params }),
  },
  webhooks: {
    list: () => apiClient.get<Webhook[]>("/webhooks"),
    create: (data: Partial<Webhook>) => apiClient.post<Webhook>("/webhooks", data),
    update: (id: string, data: Partial<Webhook>) => apiClient.patch<Webhook>(`/webhooks/${id}`, data),
    delete: (id: string) => apiClient.delete(`/webhooks/${id}`),
    test: (id: string) => apiClient.post(`/webhooks/${id}/test`),
  },
  sms: {
    list: (params?: { limit?: number; offset?: number }) =>
      apiClient.get<SMSMessage[]>("/sms", { params }),
    send: (data: { to: string; message: string }) =>
      apiClient.post<SMSMessage>("/sms/send", data),
  },
  apiKeys: {
    list: () => apiClient.get<APIKey[]>("/api-keys"),
    create: (data: { name: string; permissions?: string[] }) =>
      apiClient.post<APIKey>("/api-keys", data),
    revoke: (id: string) => apiClient.delete(`/api-keys/${id}`),
  },
  wallet: {
    getBalance: () => apiClient.get<WalletBalance>("/payments/wallet"),
    topup: (data: { amount: number; provider: string; currency?: string }) =>
      apiClient.post("/payments/topup", data),
    transactions: (params?: { limit?: number; offset?: number }) =>
      apiClient.get<Transaction[]>("/payments/transactions", { params }),
    redeemCoupon: (data: { code: string }) =>
      apiClient.post("/payments/redeem-coupon", data),
  },
  admin: {
    dashboard: () => apiClient.get("/admin/dashboard"),
    tenants: (params?: { status?: string; search?: string; page?: number; page_size?: number }) =>
      apiClient.get<Tenant[]>("/admin/tenants", { params }),
    tenantDetail: (id: string) => apiClient.get<Tenant>(`/admin/tenants/${id}`),
    tenantAction: (id: string, action: string) =>
      apiClient.post(`/admin/tenants/${id}/action`, { action }),
    auditLogs: (params?: { action?: string; tenant_id?: string; page?: number; page_size?: number }) =>
      apiClient.get<AuditLog[]>("/admin/audit-logs", { params }),
    settings: () => apiClient.get("/admin/settings"),
    updateSetting: (key: string, value: string) =>
      apiClient.put(`/admin/settings/${key}`, { value }),
    coupons: () => apiClient.get<Coupon[]>("/admin/coupons"),
    createCoupon: (data: Partial<Coupon>) => apiClient.post<Coupon>("/admin/coupons", data),
    deleteCoupon: (id: string) => apiClient.delete(`/admin/coupons/${id}`),
  },
}