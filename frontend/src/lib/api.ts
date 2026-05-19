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
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

export interface Agent {
  id: string
  name: string
  voice_type: string
  status: "active" | "inactive"
  call_count: number
  created_at: string
  greeting?: string
}

export interface DID {
  id: string
  number: string
  status: "active" | "inactive"
  agent_id?: string
  monthly_cost: number
  country: string
  created_at: string
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

export const api = {
  agents: {
    list: () => apiClient.get<Agent[]>("/agents/"),
    get: (id: string) => apiClient.get<Agent>(`/agents/${id}`),
    create: (data: Partial<Agent>) => apiClient.post<Agent>("/agents/", data),
    update: (id: string, data: Partial<Agent>) => apiClient.put<Agent>(`/agents/${id}`, data),
    delete: (id: string) => apiClient.delete(`/agents/${id}`),
  },
  dids: {
    list: () => apiClient.get<DID[]>("/dids/"),
    get: (id: string) => apiClient.get<DID>(`/dids/${id}`),
    create: (data: Partial<DID>) => apiClient.post<DID>("/dids/", data),
    update: (id: string, data: Partial<DID>) => apiClient.put<DID>(`/dids/${id}`, data),
    delete: (id: string) => apiClient.delete(`/dids/${id}`),
  },
  calls: {
    list: (params?: { limit?: number; offset?: number }) =>
      apiClient.get<{ calls: Call[]; total: number }>("/calls/", { params }),
    get: (id: string) => apiClient.get<Call>(`/calls/${id}`),
  },
  wallet: {
    getBalance: () => apiClient.get<WalletBalance>("/wallet/balance"),
  },
}