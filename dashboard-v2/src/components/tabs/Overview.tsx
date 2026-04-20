import { Users, Clock, AlertTriangle, XCircle, Activity, RefreshCw } from 'lucide-react'
import { useAnalytics, useAgents, useAgentStatus, useDashboard } from '../../api'
import StatusBadge from '../StatusBadge'

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ size?: number; className?: string; color?: string }>
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}15` }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div className="text-xs text-gray-400">{label}</div>
        <div className="text-2xl font-bold text-white mt-0.5">{value}</div>
      </div>
    </div>
  )
}

function timeAgo(ts: string | undefined): string {
  if (!ts) return 'Unknown'
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatCost(val: number | undefined): string {
  if (!val) return ''
  return `$${val.toFixed(4)}`
}

export default function Overview() {
  const analytics = useAnalytics()
  const agents = useAgents()
  const agentStatus = useAgentStatus()
  const dashboard = useDashboard()

  const agentList = agents.data ?? []
  const statusMap = agentStatus.data ?? {}
  const today = analytics.data?.today
  const feed = analytics.data?.recentFeed ?? []
  const dash = dashboard.data

  const activeCount = Object.values(statusMap).filter(s => s.status === 'online').length || agentList.length
  const openTickets = dash?.openTickets ?? '—'
  const errorsToday = dash?.errorsToday ?? 0
  const cronEnabled = dash?.cronJobsEnabled ?? 40

  const isLoading = analytics.isLoading || agents.isLoading

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Mission Control</h1>
          <p className="text-xs text-gray-400 mt-0.5">OpenClaw RedOS — Real-time overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <RefreshCw size={12} className={isLoading ? 'animate-spin text-[#00d4ff]' : ''} />
          {isLoading ? 'Refreshing…' : 'Auto-refresh 30s'}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}         label="Active Agents"   value={activeCount} color="#00d4ff" />
        <StatCard icon={Clock}         label="Cron Jobs Active" value={cronEnabled}  color="#00ff88" />
        <StatCard icon={AlertTriangle} label="Open Tickets"    value={openTickets}  color="#ffaa00" />
        <StatCard icon={XCircle}       label="Errors Today"    value={errorsToday}  color="#ff3366" />
      </div>

      {/* Agent roster + feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent roster */}
        <div className="lg:col-span-2 bg-[#151932] border border-[#1e2645] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Users size={14} className="text-[#00d4ff]" />
            Agent Roster
          </h2>
          {agents.isLoading ? (
            <div className="text-gray-500 text-sm">Loading agents…</div>
          ) : agentList.length === 0 ? (
            <div className="text-gray-500 text-sm">No agents found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {agentList.map(agent => {
                const status = statusMap[agent.id]
                const agentStatusVal = status?.status ?? 'offline'
                return (
                  <div key={agent.id} className="bg-[#1e2645] rounded-lg p-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#00d4ff] font-bold text-xs">
                        {(agent.name ?? agent.id).slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-semibold text-white truncate">
                          {agent.name ?? agent.id}
                        </span>
                        <StatusBadge status={agentStatusVal} />
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5 truncate">{agent.role}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-[#00d4ff] font-mono truncate">
                          {agent.model ?? '—'}
                        </span>
                        <span className="text-[10px] text-gray-500 flex-shrink-0">
                          {timeAgo(status?.lastSeen)}
                        </span>
                      </div>
                      {status?.callsToday !== undefined && (
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {status.callsToday} calls today
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-4 flex flex-col">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={14} className="text-[#00d4ff]" />
            Recent Activity
          </h2>
          {analytics.isLoading ? (
            <div className="text-gray-500 text-sm">Loading feed…</div>
          ) : feed.length === 0 ? (
            <div className="text-gray-500 text-sm">No recent activity</div>
          ) : (
            <div className="space-y-2 overflow-y-auto flex-1 max-h-72">
              {feed.slice(0, 20).map((item, i) => (
                <div key={item.id ?? i} className="flex items-start gap-2 py-1.5 border-b border-[#1e2645] last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] mt-1.5 flex-shrink-0 status-pulse" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-[#00d4ff] font-medium flex-shrink-0">
                        {item.agent ?? item.agentId ?? 'system'}
                      </span>
                      {item.model && (
                        <span className="text-gray-600 truncate">{item.model}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-300 mt-0.5 truncate">
                      {item.text ?? item.message ?? '—'}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-600">{timeAgo(item.timestamp)}</span>
                      {item.cost && (
                        <span className="text-[10px] text-[#ffaa00]">{formatCost(item.cost)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Today's cost summary */}
      {today && (
        <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Today's Usage Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-400">Total Cost</div>
              <div className="text-lg font-bold text-[#00d4ff]">${(today.total ?? 0).toFixed(4)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Requests</div>
              <div className="text-lg font-bold text-white">{(today.requests ?? 0).toLocaleString()}</div>
            </div>
            {today.byModel && Object.entries(today.byModel).slice(0, 2).map(([model, cost]) => (
              <div key={model}>
                <div className="text-xs text-gray-400 truncate">{model}</div>
                <div className="text-lg font-bold text-[#00ff88]">${(cost as number).toFixed(4)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
