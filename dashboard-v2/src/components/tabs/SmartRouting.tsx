import { CheckCircle } from 'lucide-react'
import { useRouting, useAgents } from '../../api'

const STATIC_ROUTING = {
  profile: 'cost_saver',
  tiers: [
    {
      name: 'Tier 1 — Free / Zero Cost',
      color: '#00ff88',
      models: ['9router/free-unlimited', 'ollama/qwen2.5-coder:7b'],
      description: 'Primary tier — zero marginal cost. Used for 95%+ of requests.',
    },
    {
      name: 'Tier 2 — Cheap Fallback',
      color: '#ffaa00',
      models: ['9router/heartbeat-cheap', 'perplexity/sonar-pro'],
      description: 'Subscription-included fallback for when free-unlimited is unavailable.',
    },
    {
      name: 'Tier 3 — Premium (Explicit Only)',
      color: '#ff3366',
      models: ['openai-codex/gpt-5.2', 'zai/glm-4.7', 'zai/glm-4.7-flashx'],
      description: 'Never used in crons or fallbacks. Only explicit agent calls. PAYG models flagged.',
    },
  ],
  agentRouting: [
    { agent: 'main (RED)', id: 'main', model: '9router/free-unlimited', fallback: 'heartbeat-cheap → gpt-5.2', tier: 1 },
    { agent: 'allrounder (ZEN)', id: 'allrounder', model: '9router/free-unlimited', fallback: 'heartbeat-cheap → gpt-5.2', tier: 1 },
    { agent: 'hatake (HATAKE)', id: 'hatake', model: 'ollama/qwen2.5-coder:7b', fallback: 'none', tier: 1 },
    { agent: 'eng (ENG)', id: 'eng', model: '9router/free-unlimited', fallback: 'heartbeat-cheap → gpt-5.2', tier: 1 },
    { agent: 'research (RESEARCH)', id: 'research', model: '9router/free-unlimited', fallback: 'heartbeat-cheap → gpt-5.2', tier: 1 },
    { agent: 'finance (FINANCE)', id: 'finance', model: '9router/free-unlimited', fallback: 'heartbeat-cheap → gpt-5.2', tier: 1 },
    { agent: 'ops (OPS)', id: 'ops', model: '9router/free-unlimited', fallback: 'heartbeat-cheap → gpt-5.2', tier: 1 },
    { agent: 'infosec (INFOSEC)', id: 'infosec', model: '9router/free-unlimited', fallback: 'heartbeat-cheap → gpt-5.2', tier: 1 },
  ],
}

export default function SmartRouting() {
  const routing = useRouting()
  const agents = useAgents()

  const agentList = agents.data ?? []
  const routingData = routing.data

  const profile = routingData?.profile ?? STATIC_ROUTING.profile

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Smart Routing</h1>
          <p className="text-xs text-gray-400 mt-0.5">Model routing strategy and agent assignments</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Active Profile:</span>
          <span className="text-xs px-2.5 py-1 rounded-md bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] font-bold">
            {profile}
          </span>
        </div>
      </div>

      {/* Routing Philosophy */}
      <div className="bg-[#00d4ff]/5 border border-[#00d4ff]/20 rounded-xl p-4">
        <h2 className="text-xs font-semibold text-[#00d4ff] mb-2">Routing Philosophy</h2>
        <div className="text-xs text-gray-300 space-y-1 leading-relaxed">
          <p>All agents default to <span className="text-[#00d4ff] font-mono">9router/free-unlimited</span> with automatic failover.
          Model is <strong className="text-white">never hardcoded in cron payloads</strong> — agent defaults apply centrally.</p>
          <p>HATAKE uses local Ollama inference exclusively. RESEARCH may explicitly call Perplexity sonar-pro.
          ZAI PAYG models are blocked from cron and fallback chains.</p>
        </div>
      </div>

      {/* 3-Tier Model Breakdown */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">3-Tier Model Strategy</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATIC_ROUTING.tiers.map(tier => (
            <div key={tier.name}
              className="bg-[#151932] border border-[#1e2645] rounded-xl p-4"
              style={{ borderLeftColor: tier.color, borderLeftWidth: 3 }}>
              <div className="text-xs font-semibold mb-1" style={{ color: tier.color }}>{tier.name}</div>
              <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">{tier.description}</p>
              <div className="space-y-1">
                {tier.models.map(m => (
                  <div key={m} className="flex items-center gap-1.5 text-[10px]">
                    <CheckCircle size={10} style={{ color: tier.color }} />
                    <span className="font-mono text-gray-300">{m}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Model Assignment Table */}
      <div className="bg-[#151932] border border-[#1e2645] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1e2645]">
          <h2 className="text-xs font-semibold text-white">Agent Model Assignments</h2>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1e2645]">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Agent</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Primary Model</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Fallback Chain</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Tier</th>
            </tr>
          </thead>
          <tbody>
            {STATIC_ROUTING.agentRouting.map((row, i) => {
              // Try to overlay real agent model from API
              const liveAgent = agentList.find(a => a.id === row.id)
              const model = liveAgent?.model ?? row.model
              const tierColor = row.tier === 1 ? '#00ff88' : row.tier === 2 ? '#ffaa00' : '#ff3366'
              return (
                <tr key={i} className="border-b border-[#1e2645] hover:bg-[#1e2645]/30">
                  <td className="px-4 py-3 text-white font-medium">{row.agent}</td>
                  <td className="px-4 py-3 font-mono text-[#00d4ff] text-[10px]">{model}</td>
                  <td className="px-4 py-3 text-gray-400 text-[10px]">{row.fallback}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ color: tierColor, backgroundColor: `${tierColor}15` }}>
                      T{row.tier}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Routing rules from API (if available) */}
      {routingData?.rules && routingData.rules.length > 0 && (
        <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-4">
          <h2 className="text-xs font-semibold text-white mb-3">Live Routing Rules</h2>
          <div className="space-y-2">
            {routingData.rules.map((rule, i) => (
              <div key={i} className="bg-[#1e2645] rounded-lg px-3 py-2 text-xs text-gray-300 flex items-center gap-3">
                {rule.agent && <span className="text-[#00d4ff]">{rule.agent}</span>}
                {rule.model && <span className="font-mono text-gray-400">→ {rule.model}</span>}
                {rule.profile && <span className="text-[#ffaa00]">[{rule.profile}]</span>}
                {rule.description && <span className="text-gray-500">{rule.description}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
