import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  Agent,
  AgentStatusMap,
  Analytics,
  PipelineRequest,
  Ticket,
  StandupEntry,
  CronJob,
  DashboardData,
  ErrorEntry,
  GatewayLog,
  Skill,
  RoutingData,
  CachingData,
  PromptEngData,
  MissionControlCosts,
  MissionControlSavings,
  MissionControlSubscriptions,
  CeoStatus,
  SearchResult,
} from './types'

export const API = 'http://localhost:19000'

// ─── Fetch helper ──────────────────────────────────────────────────────────
async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`API ${path} → ${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

// ─── Dashboard Overview ────────────────────────────────────────────────────
export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<DashboardData>('/api/dashboard'),
    refetchInterval: 30_000,
    retry: 1,
  })
}

// ─── Analytics ─────────────────────────────────────────────────────────────
export function useAnalytics() {
  return useQuery<Analytics>({
    queryKey: ['analytics'],
    queryFn: () => apiFetch<Analytics>('/api/analytics'),
    refetchInterval: 30_000,
    retry: 1,
  })
}

// ─── Agents ────────────────────────────────────────────────────────────────
export function useAgents() {
  return useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: () => apiFetch<Agent[]>('/api/agents'),
    refetchInterval: 30_000,
    retry: 1,
  })
}

export function useAgentStatus() {
  return useQuery<AgentStatusMap>({
    queryKey: ['agent-status'],
    queryFn: () => apiFetch<AgentStatusMap>('/api/agent-status'),
    refetchInterval: 30_000,
    retry: 1,
  })
}

export function useUpdateAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Agent> }) =>
      fetch(`${API}/api/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  })
}

export function useCreateAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Agent>) =>
      fetch(`${API}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  })
}

export function useDeleteAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`${API}/api/agents/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  })
}

// ─── Pipeline ──────────────────────────────────────────────────────────────
export function usePipeline() {
  return useQuery<PipelineRequest[]>({
    queryKey: ['pipeline'],
    queryFn: () => apiFetch<PipelineRequest[]>('/api/pipeline'),
    refetchInterval: 15_000,
    retry: 1,
  })
}

// ─── Tickets ───────────────────────────────────────────────────────────────
export function useTickets() {
  return useQuery<Ticket[]>({
    queryKey: ['tickets'],
    queryFn: () => apiFetch<Ticket[]>('/api/tickets'),
    refetchInterval: 30_000,
    retry: 1,
  })
}

// ─── Standups ──────────────────────────────────────────────────────────────
export function useStandups() {
  return useQuery<StandupEntry[]>({
    queryKey: ['standups'],
    queryFn: () => apiFetch<StandupEntry[]>('/api/standups'),
    refetchInterval: 30_000,
    retry: 1,
  })
}

// ─── Cron Jobs ─────────────────────────────────────────────────────────────
export function useCronJobs() {
  return useQuery<CronJob[]>({
    queryKey: ['cron-jobs'],
    queryFn: () => apiFetch<CronJob[]>('/api/cron-jobs'),
    refetchInterval: 60_000,
    retry: 1,
  })
}

export function useUpdateCronJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { model?: string; enabled?: boolean } }) =>
      fetch(`${API}/api/cron-jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cron-jobs'] }),
  })
}

// ─── Errors & Logs ─────────────────────────────────────────────────────────
export function useErrors() {
  return useQuery<ErrorEntry[]>({
    queryKey: ['errors'],
    queryFn: () => apiFetch<ErrorEntry[]>('/api/errors'),
    refetchInterval: 5_000,
    retry: 1,
  })
}

export function useGatewayErrors() {
  return useQuery<ErrorEntry[]>({
    queryKey: ['gateway-errors'],
    queryFn: () => apiFetch<ErrorEntry[]>('/api/gateway-errors'),
    refetchInterval: 5_000,
    retry: 1,
  })
}

export function useGatewayLogs() {
  return useQuery<string[] | GatewayLog[]>({
    queryKey: ['gateway-logs'],
    queryFn: () => apiFetch<string[] | GatewayLog[]>('/api/gateway-logs'),
    refetchInterval: 5_000,
    retry: 1,
  })
}

// ─── Skills ────────────────────────────────────────────────────────────────
export function useSkillDetails() {
  return useQuery<Skill[]>({
    queryKey: ['skill-details'],
    queryFn: () => apiFetch<Skill[]>('/api/skill-details'),
    retry: 1,
  })
}

// ─── Routing ───────────────────────────────────────────────────────────────
export function useRouting() {
  return useQuery<RoutingData>({
    queryKey: ['routing'],
    queryFn: () => apiFetch<RoutingData>('/api/routing'),
    retry: 1,
  })
}

// ─── Caching ───────────────────────────────────────────────────────────────
export function useCaching() {
  return useQuery<CachingData>({
    queryKey: ['caching'],
    queryFn: () => apiFetch<CachingData>('/api/caching'),
    retry: 1,
  })
}

// ─── Prompt Engineering ────────────────────────────────────────────────────
export function usePromptEngineering() {
  return useQuery<PromptEngData>({
    queryKey: ['prompt-engineering'],
    queryFn: () => apiFetch<PromptEngData>('/api/prompt-engineering'),
    retry: 1,
  })
}

// ─── Mission Control: Costs ────────────────────────────────────────────────
export function useMissionCosts(days = 30) {
  return useQuery<MissionControlCosts>({
    queryKey: ['mission-control-costs', days],
    queryFn: () => apiFetch<MissionControlCosts>(`/api/mission-control/costs?days=${days}`),
    refetchInterval: 10_000,
    retry: 1,
  })
}

// ─── Mission Control: Savings ──────────────────────────────────────────────
export function useMissionSavings(days = 30) {
  return useQuery<MissionControlSavings>({
    queryKey: ['mission-control-savings', days],
    queryFn: () => apiFetch<MissionControlSavings>(`/api/mission-control/savings?days=${days}`),
    refetchInterval: 10_000,
    retry: 1,
  })
}

// ─── Mission Control: Subscriptions ───────────────────────────────────────
export function useMissionSubscriptions() {
  return useQuery<MissionControlSubscriptions>({
    queryKey: ['mission-control-subscriptions'],
    queryFn: () => apiFetch<MissionControlSubscriptions>('/api/mission-control/subscriptions'),
    refetchInterval: 60_000,
    retry: 1,
  })
}

// ─── CEO ───────────────────────────────────────────────────────────────────
export function useCeoStatus() {
  return useQuery<CeoStatus>({
    queryKey: ['ceo-status'],
    queryFn: () => apiFetch<CeoStatus>('/api/ceo/status'),
    refetchInterval: 60_000,
    retry: 1,
  })
}

export function useCeoHire() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; role: string; model: string }) =>
      fetch(`${API}/api/ceo/hire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] })
      qc.invalidateQueries({ queryKey: ['ceo-status'] })
    },
  })
}

export function useCeoFire() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (agentId: string) =>
      fetch(`${API}/api/ceo/fire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
        credentials: 'include',
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] })
      qc.invalidateQueries({ queryKey: ['ceo-status'] })
    },
  })
}

// ─── Search ────────────────────────────────────────────────────────────────
export function useSearch(q: string) {
  return useQuery<SearchResult[]>({
    queryKey: ['search', q],
    queryFn: () => apiFetch<SearchResult[]>(`/api/search?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length > 0,
    retry: 1,
  })
}

// ─── Cost Details (legacy) ─────────────────────────────────────────────────
export function useCostDetails() {
  return useQuery({
    queryKey: ['cost-details'],
    queryFn: () => apiFetch('/api/cost-details'),
    refetchInterval: 10_000,
    retry: 1,
  })
}
