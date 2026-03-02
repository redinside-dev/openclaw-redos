// ─── Agent Types ───────────────────────────────────────────────────────────
export interface Agent {
  id: string
  name: string
  role: string
  model: string
  parent?: string
  bot?: string
}

export interface AgentStatus {
  lastSeen: string
  callsToday: number
  model: string
  status: 'online' | 'idle' | 'offline'
}

export type AgentStatusMap = Record<string, AgentStatus>

// ─── Analytics ─────────────────────────────────────────────────────────────
export interface AnalyticsToday {
  total: number
  requests: number
  byModel: Record<string, number>
  byAgent: Record<string, number>
}

export interface FeedItem {
  id?: string
  timestamp: string
  agent?: string
  agentId?: string
  message?: string
  text?: string
  model?: string
  cost?: number
  tokens?: number
}

export interface Analytics {
  today: AnalyticsToday
  recentFeed: FeedItem[]
}

// ─── Pipeline ──────────────────────────────────────────────────────────────
export interface TraceStep {
  model?: string
  tokens?: number
  latencyMs?: number
  cost?: number
  response?: string
  timestamp?: string
  step?: string
  input?: string
  output?: string
}

export interface PipelineRequest {
  id: string
  reqId?: string
  agent?: string
  agentId?: string
  message?: string
  input?: string
  model?: string
  latencyMs?: number
  costUsd?: number
  cost?: number
  timestamp?: string
  createdAt?: string
  trace?: TraceStep[]
  steps?: TraceStep[]
  tokens?: number
}

// ─── Tickets ───────────────────────────────────────────────────────────────
export type TicketSeverity = 'critical' | 'high' | 'medium' | 'low'
export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed'

export interface Ticket {
  id: string
  title: string
  severity: TicketSeverity
  status: TicketStatus
  createdAt: string
  sla?: string
  assignee?: string
  description?: string
}

// ─── Standup ───────────────────────────────────────────────────────────────
export interface StandupEntry {
  id?: string
  agentId?: string
  agent?: string
  date?: string
  timestamp?: string
  focus?: string
  blockers?: string
  completed?: string[]
  planned?: string[]
  content?: string
}

// ─── Cron Jobs ─────────────────────────────────────────────────────────────
export interface CronJob {
  id?: string
  name: string
  schedule: string
  agent?: string
  agentId?: string
  enabled: boolean
  lastRun?: string
  status?: 'success' | 'failed' | 'running' | 'pending'
  description?: string
  model?: string
}

// ─── Dashboard Overview ────────────────────────────────────────────────────
export interface DashboardData {
  activeAgents?: number
  cronJobsEnabled?: number
  openTickets?: number
  errorsToday?: number
  uptime?: string
  lastUpdated?: string
}

// ─── Errors & Logs ─────────────────────────────────────────────────────────
export interface ErrorEntry {
  id?: string
  timestamp: string
  level?: string
  type?: string
  message: string
  agent?: string
  agentId?: string
  stack?: string
}

export interface GatewayLog {
  timestamp?: string
  line?: string
  level?: string
  message?: string
}

// ─── Skills ────────────────────────────────────────────────────────────────
export interface Skill {
  id?: string
  name: string
  description?: string
  enabled?: boolean
  category?: string
  file?: string
}

// ─── Routing ───────────────────────────────────────────────────────────────
export interface RoutingRule {
  agent?: string
  agentId?: string
  model?: string
  tier?: string
  profile?: string
  description?: string
}

export interface RoutingData {
  profile?: string
  rules?: RoutingRule[]
  agents?: RoutingRule[]
  tiers?: Array<{ name: string; models: string[]; cost: string }>
}

// ─── Caching ───────────────────────────────────────────────────────────────
export interface CachingData {
  enabled?: boolean
  hitRate?: number
  hit_rate?: number
  size?: number
  maxSize?: number
  ttl?: number
  entries?: number
  config?: Record<string, unknown>
}

// ─── Prompt Engineering ────────────────────────────────────────────────────
export interface PromptStep {
  id?: string
  name: string
  type?: string
  description?: string
  enabled?: boolean
}

export interface PromptEngData {
  pipeline?: PromptStep[]
  steps?: PromptStep[]
  systemPrompt?: string
  templates?: Array<{ name: string; content: string }>
}

// ─── Cost / Mission Control ────────────────────────────────────────────────
export interface CostByEntry {
  name: string
  cost: number
  pct?: number
}

export interface DailyBurnEntry {
  date: string
  cost_usd: number
}

export interface MissionControlCosts {
  by_agent: CostByEntry[]
  by_model: CostByEntry[]
  by_tier: CostByEntry[]
  daily_burn: DailyBurnEntry[]
  total_cost_usd: number
}

export interface MissionControlSavings {
  savings_pct: number
  optimization_score: number
  cache_hit_rate_pct: number
  savings_usd?: number
  monthly_projected_savings_usd?: number
  baseline_cost_usd?: number
}

export interface Subscription {
  name: string
  cost_usd: number
  billing_cycle?: string
  description?: string
}

export interface MissionControlSubscriptions {
  subscriptions: Subscription[]
  total_fixed_monthly_usd: number
}

// ─── Cost Details ──────────────────────────────────────────────────────────
export interface CostDetails {
  today?: {
    total: number
    byModel?: Record<string, number>
    byAgent?: Record<string, number>
  }
  monthly?: number
  dailyLimit?: number
  daily_limit?: number
}

// ─── CEO ───────────────────────────────────────────────────────────────────
export interface CeoStatus {
  status?: string
  lastAction?: string
  recentActions?: Array<{
    action: string
    timestamp: string
    result?: string
  }>
  agentCount?: number
  uptime?: string
}

// ─── Search ────────────────────────────────────────────────────────────────
export interface SearchResult {
  id?: string
  title?: string
  text?: string
  snippet?: string
  score?: number
  type?: string
  agent?: string
  timestamp?: string
  relevance?: number
}
