import { useState } from 'react'
import { Zap, Search, CheckCircle, XCircle } from 'lucide-react'
import { useSkillDetails } from '../../api'

// Fallback static skills from CLAUDE.md (43 total)
const STATIC_SKILLS = [
  { name: 'maker-checker', description: 'L0–L5 bounded autonomy approval flow', enabled: true, category: 'security' },
  { name: 'n8n-webhooks', description: 'Credential-isolated external API calls via n8n', enabled: true, category: 'integration' },
  { name: 'memory-core', description: 'Injects SOUL.md + MEMORY.md into agent sessions', enabled: true, category: 'memory' },
  { name: 'budget-guardrails', description: 'Per-agent cost limits and spend alerts', enabled: true, category: 'cost' },
  { name: 'context-pruning', description: 'Automatic session history compression', enabled: true, category: 'performance' },
  { name: 'a2a-review', description: 'Agent-to-agent review for L3+ actions (INFOSEC)', enabled: true, category: 'security' },
  { name: 'telegram-approval', description: 'Telegram-based L4/L5 approval workflow', enabled: true, category: 'security' },
  { name: 'cron-orchestration', description: 'Scheduled task management and execution', enabled: true, category: 'automation' },
  { name: 'llm-analytics', description: 'Token usage and cost tracking per request', enabled: true, category: 'analytics' },
  { name: 'episode-memory', description: 'Episodic memory retrieval from episodes.jsonl', enabled: true, category: 'memory' },
  { name: 'state-sync', description: 'Shared STATE.yaml read/write for cross-agent coordination', enabled: true, category: 'coordination' },
  { name: 'ticket-tracker', description: 'TICK-XXX issue creation and status management', enabled: true, category: 'ops' },
  { name: 'standup-reporter', description: 'Daily agent standup summary generation', enabled: true, category: 'ops' },
  { name: 'goal-alignment', description: 'GOALS.md reference in decision-making', enabled: true, category: 'coordination' },
  { name: 'autonomous-queue', description: 'AUTONOMOUS.md task queue management', enabled: true, category: 'automation' },
  { name: 'semantic-search', description: 'Workspace semantic search over logs and memory', enabled: true, category: 'search' },
  { name: 'pipeline-trace', description: 'Request trace capture with step-level detail', enabled: true, category: 'analytics' },
  { name: 'model-routing', description: '9Router smart model routing with fallback chains', enabled: true, category: 'routing' },
  { name: 'ollama-inference', description: 'Local Ollama model inference for HATAKE', enabled: true, category: 'routing' },
  { name: 'perplexity-search', description: 'Perplexity sonar-pro for RESEARCH explicit calls', enabled: true, category: 'integration' },
]

const CATEGORIES = ['all', 'security', 'memory', 'analytics', 'automation', 'coordination', 'ops', 'routing', 'integration', 'cost', 'performance', 'search']

export default function Skills() {
  const skillDetails = useSkillDetails()
  const [filter, setFilter] = useState('')
  const [category, setCategory] = useState('all')

  // Use API data if available, otherwise fall back to static
  const apiSkills = skillDetails.data ?? []
  const skills = apiSkills.length > 0 ? apiSkills : STATIC_SKILLS

  const filtered = skills.filter(skill => {
    const matchFilter = !filter ||
      skill.name.toLowerCase().includes(filter.toLowerCase()) ||
      (skill.description ?? '').toLowerCase().includes(filter.toLowerCase())
    const matchCat = category === 'all' || skill.category === category
    return matchFilter && matchCat
  })

  const enabledCount = skills.filter(s => s.enabled !== false).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Skills</h1>
          <p className="text-xs text-gray-400 mt-0.5">Registered declarative skills from workspace/skills/</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-[#00ff88]">{enabledCount} active</span>
          <span className="text-gray-500">{skills.length} total</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="w-56 bg-[#151932] border border-[#1e2645] text-white text-xs rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-[#00d4ff]"
            placeholder="Search skills…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-2.5 py-1 text-[10px] rounded-md font-medium transition-colors
                ${category === cat
                  ? 'bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/40'
                  : 'bg-[#151932] text-gray-400 border border-[#1e2645] hover:border-[#2a3558]'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Skills grid */}
      {skillDetails.isLoading ? (
        <div className="text-gray-500 text-sm">Loading skills…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((skill, i) => (
            <div key={skill.name ?? i}
              className="bg-[#151932] border border-[#1e2645] rounded-xl p-4 hover:border-[#2a3558] transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#00d4ff]/10 flex items-center justify-center flex-shrink-0">
                    <Zap size={12} className="text-[#00d4ff]" />
                  </div>
                  <span className="text-xs font-semibold text-white font-mono">{skill.name}</span>
                </div>
                {skill.enabled !== false ? (
                  <CheckCircle size={13} className="text-[#00ff88] flex-shrink-0" />
                ) : (
                  <XCircle size={13} className="text-gray-600 flex-shrink-0" />
                )}
              </div>

              {skill.description && (
                <p className="text-[10px] text-gray-400 leading-relaxed">{skill.description}</p>
              )}

              {skill.category && (
                <div className="mt-2">
                  <span className="text-[9px] px-2 py-0.5 rounded bg-[#1e2645] text-gray-500">
                    {skill.category}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && !skillDetails.isLoading && (
        <div className="text-center py-8 text-gray-500 text-sm">
          No skills match the current filter
        </div>
      )}
    </div>
  )
}
