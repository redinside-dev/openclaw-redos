import { useState } from 'react'
import { Users, Edit2, X } from 'lucide-react'
import { useAgents, useAgentStatus, useUpdateAgent } from '../../api'
import StatusBadge from '../StatusBadge'
import toast from 'react-hot-toast'
import type { Agent } from '../../types'

const KNOWN_MODELS = [
  '9router/free-unlimited',
  '9router/heartbeat-cheap',
  'openai-codex/gpt-5.2',
  'ollama/qwen2.5-coder:7b',
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-3-5',
]


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

function EditModal({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const [model, setModel] = useState(agent.model ?? '')
  const [role, setRole] = useState(agent.role ?? '')
  const updateAgent = useUpdateAgent()

  const handleSave = async () => {
    try {
      await updateAgent.mutateAsync({ id: agent.id, data: { model, role } })
      toast.success(`Agent ${agent.name} updated`)
      onClose()
    } catch {
      toast.error('Failed to update agent')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Edit Agent: {agent.name}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Model</label>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="w-full bg-[#1e2645] border border-[#2a3558] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#00d4ff]"
            >
              {KNOWN_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
              <option value={model}>{model}</option>
            </select>
            <input
              className="w-full mt-1 bg-[#1e2645] border border-[#2a3558] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#00d4ff]"
              placeholder="Or type custom model…"
              value={model}
              onChange={e => setModel(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Role</label>
            <input
              className="w-full bg-[#1e2645] border border-[#2a3558] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#00d4ff]"
              value={role}
              onChange={e => setRole(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose}
            className="flex-1 px-3 py-2 text-xs text-gray-400 border border-[#1e2645] rounded-lg hover:bg-[#1e2645] transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={updateAgent.isPending}
            className="flex-1 px-3 py-2 text-xs text-white bg-[#00d4ff]/20 border border-[#00d4ff]/50 rounded-lg hover:bg-[#00d4ff]/30 transition-colors disabled:opacity-50">
            {updateAgent.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AgentCard({ agent, editAgent }: {
  agent: Agent
  editAgent: (a: Agent) => void
}) {
  const agentStatus = useAgentStatus()
  const statusMap = agentStatus.data ?? {}
  const status = statusMap[agent.id]
  const agentStatusVal = status?.status ?? 'offline'

  const initials = (agent.name ?? agent.id).slice(0, 2).toUpperCase()
  const isRed = agent.id === 'main'

  return (
    <div className={`bg-[#1e2645] rounded-xl p-4 border ${isRed ? 'border-[#00d4ff]/40' : 'border-[#1e2645]'} relative group`}>
      {isRed && (
        <div className="absolute top-2 right-2 text-[10px] text-[#00d4ff] font-bold">CEO</div>
      )}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
          ${isRed ? 'bg-[#00d4ff]/20 border-2 border-[#00d4ff]' : 'bg-[#2a3558] border border-[#3a4468]'}`}>
          <span className={isRed ? 'text-[#00d4ff]' : 'text-gray-300'}>{initials}</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white truncate">{agent.name ?? agent.id}</span>
            <StatusBadge status={agentStatusVal} showDot />
          </div>
          <div className="text-[10px] text-gray-400 truncate">{agent.role ?? '—'}</div>
        </div>
      </div>

      <div className="space-y-1.5 text-[10px]">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Model</span>
          <span className="text-[#00d4ff] font-mono truncate max-w-[130px]">{agent.model ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Last seen</span>
          <span className="text-gray-300">{timeAgo(status?.lastSeen)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Calls today</span>
          <span className="text-white font-medium">{status?.callsToday ?? '—'}</span>
        </div>
        {agent.bot && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Bot</span>
            <span className="text-gray-300">{agent.bot}</span>
          </div>
        )}
      </div>

      <button
        onClick={() => editAgent(agent)}
        className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-[#00d4ff]"
      >
        <Edit2 size={13} />
      </button>
    </div>
  )
}

export default function Agents() {
  const agents = useAgents()
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)

  const agentList = agents.data ?? []

  // Sort: main first, then alphabetical
  const sorted = [...agentList].sort((a, b) => {
    if (a.id === 'main') return -1
    if (b.id === 'main') return 1
    return a.id.localeCompare(b.id)
  })

  // Hierarchy display
  const redAgent = sorted.find(a => a.id === 'main')
  const others = sorted.filter(a => a.id !== 'main')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Agents</h1>
          <p className="text-xs text-gray-400 mt-0.5">Agent roster and org hierarchy</p>
        </div>
      </div>

      {/* Org hierarchy diagram */}
      <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-4">
        <h2 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Org Hierarchy</h2>
        <div className="flex flex-wrap items-start gap-4 text-[10px]">
          <div className="flex flex-col items-center gap-1">
            <div className="px-3 py-1.5 bg-[#00d4ff]/10 border border-[#00d4ff]/40 rounded-lg text-[#00d4ff] font-bold">
              RED (CEO)
            </div>
          </div>
          <div className="text-gray-600 self-center">→</div>
          <div className="flex flex-wrap gap-2">
            {['ZEN (CSO)', 'ENG', 'RESEARCH', 'FINANCE', 'OPS', 'INFOSEC', 'HATAKE'].map(n => (
              <div key={n} className="px-2 py-1 bg-[#1e2645] border border-[#2a3558] rounded text-gray-300">
                {n}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent grid */}
      {agents.isLoading ? (
        <div className="text-gray-500 text-sm">Loading agents…</div>
      ) : agents.error ? (
        <div className="text-[#ff3366] text-sm bg-[#ff3366]/10 border border-[#ff3366]/30 rounded-lg px-4 py-3">
          Failed to load agents
        </div>
      ) : (
        <div>
          {/* CEO card full width */}
          {redAgent && (
            <div className="mb-4">
              <h2 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Command</h2>
              <div className="max-w-xs">
                <AgentCard agent={redAgent} editAgent={setEditingAgent} />
              </div>
            </div>
          )}

          {/* Rest in grid */}
          {others.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Team</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {others.map(agent => (
                  <AgentCard key={agent.id} agent={agent} editAgent={setEditingAgent} />
                ))}
              </div>
            </div>
          )}

          {agentList.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Users size={32} className="mx-auto mb-3 opacity-30" />
              <div className="text-sm">No agents found</div>
            </div>
          )}
        </div>
      )}

      {editingAgent && (
        <EditModal agent={editingAgent} onClose={() => setEditingAgent(null)} />
      )}
    </div>
  )
}
