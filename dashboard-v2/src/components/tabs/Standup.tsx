import { Calendar, Target } from 'lucide-react'
import { useStandups, useAgentStatus, useAgents } from '../../api'

const SPRINT_GOAL = 'Build & launch dashboard-v2 Mission Control; stabilise cron automation pipeline; achieve <$2/day operational cost target with 9Router routing.'

function timeAgo(ts: string | undefined): string {
  if (!ts) return 'Never'
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatDate(ts: string | undefined): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Standup() {
  const standups = useStandups()
  const agentStatus = useAgentStatus()
  const agents = useAgents()

  const agentList = agents.data ?? []
  const statusMap = agentStatus.data ?? {}
  const entries = (standups.data ?? []).slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Standup</h1>
          <p className="text-xs text-gray-400 mt-0.5">Sprint goals and agent status check-in</p>
        </div>
      </div>

      {/* Sprint Goal Banner */}
      <div className="bg-gradient-to-r from-[#00d4ff]/10 to-[#00ff88]/5 border border-[#00d4ff]/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Target size={18} className="text-[#00d4ff] flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-semibold text-[#00d4ff] uppercase tracking-wider mb-1">
              Current Sprint Goal
            </div>
            <div className="text-sm text-gray-200 leading-relaxed">{SPRINT_GOAL}</div>
          </div>
        </div>
      </div>

      {/* Agent Status Cards */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Agent Status</h2>
        {agentList.length === 0 ? (
          <div className="text-gray-500 text-sm">Loading agent status…</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {agentList.map(agent => {
              const status = statusMap[agent.id]
              const color = status?.status === 'online' ? '#00ff88' :
                            status?.status === 'idle' ? '#ffaa00' : '#6b7280'
              return (
                <div key={agent.id} className="bg-[#151932] border border-[#1e2645] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white">{agent.name ?? agent.id}</span>
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0 status-pulse"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Model</span>
                      <span className="text-[#00d4ff] font-mono truncate max-w-[80px]">
                        {(agent.model ?? '—').split('/').pop()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last seen</span>
                      <span className="text-gray-300">{timeAgo(status?.lastSeen)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Calls today</span>
                      <span className="text-white font-medium">{status?.callsToday ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Focus</span>
                      <span className="text-gray-400 truncate max-w-[80px]">{agent.role?.split(' ')[0] ?? '—'}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Standup history */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">
          <Calendar size={14} className="inline mr-2 text-[#00d4ff]" />
          Standup History (last 5)
        </h2>
        {standups.isLoading ? (
          <div className="text-gray-500 text-sm">Loading standups…</div>
        ) : standups.error ? (
          <div className="text-[#ff3366] text-sm bg-[#ff3366]/10 border border-[#ff3366]/30 rounded-lg px-4 py-3">
            Standup data unavailable
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-6 text-center">
            <Calendar size={32} className="mx-auto mb-3 text-gray-700" />
            <div className="text-gray-500 text-sm">No standup entries yet</div>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, i) => (
              <div key={entry.id ?? i} className="bg-[#151932] border border-[#1e2645] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#00d4ff]">
                      {entry.agent ?? entry.agentId ?? 'system'}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {formatDate(entry.date ?? entry.timestamp)}
                    </span>
                  </div>
                </div>

                {entry.content ? (
                  <div className="text-xs text-gray-300 leading-relaxed">{entry.content}</div>
                ) : (
                  <div className="space-y-2 text-xs">
                    {entry.focus && (
                      <div>
                        <span className="text-gray-500">Focus: </span>
                        <span className="text-gray-200">{entry.focus}</span>
                      </div>
                    )}
                    {entry.completed && entry.completed.length > 0 && (
                      <div>
                        <span className="text-[#00ff88] font-medium">Completed:</span>
                        <ul className="mt-1 space-y-0.5">
                          {entry.completed.map((item, j) => (
                            <li key={j} className="text-gray-300 pl-3 before:content-['✓'] before:text-[#00ff88] before:mr-2">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {entry.planned && entry.planned.length > 0 && (
                      <div>
                        <span className="text-[#00d4ff] font-medium">Planned:</span>
                        <ul className="mt-1 space-y-0.5">
                          {entry.planned.map((item, j) => (
                            <li key={j} className="text-gray-300 pl-3 before:content-['→'] before:text-[#00d4ff] before:mr-2">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {entry.blockers && (
                      <div>
                        <span className="text-[#ffaa00] font-medium">Blockers: </span>
                        <span className="text-gray-300">{entry.blockers}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
