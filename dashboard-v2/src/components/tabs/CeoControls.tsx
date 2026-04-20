import { useState } from 'react'
import { Crown, UserPlus, UserMinus, AlertTriangle } from 'lucide-react'
import { useCeoStatus, useCeoHire, useCeoFire, useAgents } from '../../api'
import StatusBadge from '../StatusBadge'
import toast from 'react-hot-toast'

const KNOWN_MODELS = [
  '9router/free-unlimited',
  '9router/heartbeat-cheap',
  'openai-codex/gpt-5.2',
  'ollama/qwen2.5-coder:7b',
  'claude-sonnet-4-6',
  'claude-haiku-3-5',
  'claude-opus-4-6',
]

function formatTs(ts: string | undefined): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function CeoControls() {
  const ceoStatus = useCeoStatus()
  const agents = useAgents()
  const hire = useCeoHire()
  const fire = useCeoFire()

  const [hireName, setHireName] = useState('')
  const [hireRole, setHireRole] = useState('')
  const [hireModel, setHireModel] = useState('9router/free-unlimited')
  const [confirmFire, setConfirmFire] = useState<string | null>(null)

  const ceo = ceoStatus.data
  const agentList = agents.data ?? []

  const handleHire = async () => {
    if (!hireName.trim() || !hireRole.trim()) {
      toast.error('Name and role are required')
      return
    }
    try {
      await hire.mutateAsync({ name: hireName.trim(), role: hireRole.trim(), model: hireModel })
      toast.success(`Agent ${hireName} hired!`)
      setHireName('')
      setHireRole('')
    } catch {
      toast.error('Failed to hire agent')
    }
  }

  const handleFire = async (agentId: string) => {
    try {
      await fire.mutateAsync(agentId)
      toast.success(`Agent ${agentId} removed`)
      setConfirmFire(null)
    } catch {
      toast.error('Failed to fire agent')
    }
  }

  // Core agents that cannot be fired
  const CORE_AGENTS = new Set(['main', 'allrounder', 'hatake'])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">CEO Controls</h1>
          <p className="text-xs text-gray-400 mt-0.5">Agent lifecycle management — RED (CEO) only</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-[#ffaa00]/10 border border-[#ffaa00]/30 text-[#ffaa00]">
          <Crown size={12} />
          CEO Panel
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 bg-[#ffaa00]/5 border border-[#ffaa00]/20 rounded-xl p-4">
        <AlertTriangle size={16} className="text-[#ffaa00] flex-shrink-0 mt-0.5" />
        <div className="text-xs text-gray-300">
          <strong className="text-[#ffaa00]">L4 Action:</strong> Hiring and firing agents requires Telegram approval
          (10-minute window). Core agents (RED, ZEN, HATAKE) cannot be fired from this panel.
        </div>
      </div>

      {/* CEO Status */}
      <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-4">
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Crown size={14} className="text-[#ffaa00]" />
          CEO Agent Status
        </h2>
        {ceoStatus.isLoading ? (
          <div className="text-gray-500 text-sm">Loading CEO status…</div>
        ) : ceoStatus.error ? (
          <div className="text-gray-500 text-sm">CEO status unavailable</div>
        ) : ceo ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-gray-400">Status:</span>
                <div className="mt-0.5">
                  <StatusBadge status={ceo.status ?? 'online'} />
                </div>
              </div>
              <div>
                <span className="text-gray-400">Agents under command:</span>
                <div className="text-white font-bold mt-0.5">{ceo.agentCount ?? agentList.length}</div>
              </div>
              <div>
                <span className="text-gray-400">Uptime:</span>
                <div className="text-white mt-0.5">{ceo.uptime ?? '—'}</div>
              </div>
            </div>

            {ceo.lastAction && (
              <div className="bg-[#1e2645] rounded-lg px-3 py-2">
                <span className="text-[10px] text-gray-400">Last Action: </span>
                <span className="text-[10px] text-gray-200">{ceo.lastAction}</span>
              </div>
            )}

            {ceo.recentActions && ceo.recentActions.length > 0 && (
              <div>
                <div className="text-[10px] text-gray-400 mb-2">Recent Actions:</div>
                <div className="space-y-1">
                  {ceo.recentActions.map((action, i) => (
                    <div key={i} className="flex items-center gap-3 text-[10px] bg-[#1e2645] rounded px-3 py-1.5">
                      <span className="text-gray-500 flex-shrink-0">{formatTs(action.timestamp)}</span>
                      <span className="text-gray-200">{action.action}</span>
                      {action.result && (
                        <span className={`ml-auto flex-shrink-0 ${action.result === 'success' ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                          {action.result}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500 text-sm">No CEO data available</div>
        )}
      </div>

      {/* Hire form */}
      <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-4">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <UserPlus size={14} className="text-[#00ff88]" />
          Hire New Agent
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Agent Name *</label>
            <input
              className="w-full bg-[#1e2645] border border-[#2a3558] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#00d4ff]"
              placeholder="e.g. dataeng"
              value={hireName}
              onChange={e => setHireName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Role *</label>
            <input
              className="w-full bg-[#1e2645] border border-[#2a3558] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#00d4ff]"
              placeholder="e.g. Data Engineering"
              value={hireRole}
              onChange={e => setHireRole(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Model</label>
            <select
              className="w-full bg-[#1e2645] border border-[#2a3558] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#00d4ff]"
              value={hireModel}
              onChange={e => setHireModel(e.target.value)}
            >
              {KNOWN_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={handleHire}
          disabled={hire.isPending || !hireName.trim() || !hireRole.trim()}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] rounded-lg hover:bg-[#00ff88]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UserPlus size={13} />
          {hire.isPending ? 'Hiring…' : 'Hire Agent'}
        </button>
      </div>

      {/* Agent roster + fire */}
      <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-4">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <UserMinus size={14} className="text-[#ff3366]" />
          Current Agents
        </h2>
        {agents.isLoading ? (
          <div className="text-gray-500 text-sm">Loading agents…</div>
        ) : (
          <div className="space-y-2">
            {agentList.map(agent => {
              const isCore = CORE_AGENTS.has(agent.id)
              const isConfirming = confirmFire === agent.id
              return (
                <div key={agent.id}
                  className="flex items-center justify-between bg-[#1e2645] rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#2a3558] flex items-center justify-center text-[10px] text-gray-300 font-bold">
                      {(agent.name ?? agent.id).slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-medium text-white">{agent.name ?? agent.id}</span>
                      <span className="text-[10px] text-gray-400 ml-2">{agent.role}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCore ? (
                      <span className="text-[10px] text-gray-600">Core agent</span>
                    ) : isConfirming ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#ff3366]">Confirm fire?</span>
                        <button
                          onClick={() => handleFire(agent.id)}
                          disabled={fire.isPending}
                          className="px-2.5 py-1 text-[10px] bg-[#ff3366]/20 border border-[#ff3366]/40 text-[#ff3366] rounded hover:bg-[#ff3366]/30 transition-colors"
                        >
                          Yes, Fire
                        </button>
                        <button
                          onClick={() => setConfirmFire(null)}
                          className="px-2.5 py-1 text-[10px] text-gray-400 border border-[#2a3558] rounded hover:border-[#3a4468] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmFire(agent.id)}
                        className="flex items-center gap-1 px-2.5 py-1 text-[10px] text-gray-500 border border-[#2a3558] rounded hover:text-[#ff3366] hover:border-[#ff3366]/30 transition-colors"
                      >
                        <UserMinus size={10} />
                        Fire
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
