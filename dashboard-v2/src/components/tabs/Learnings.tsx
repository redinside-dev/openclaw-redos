import { BookOpen, Lightbulb, Shield, Zap, DollarSign, Code } from 'lucide-react'

const LEARNINGS = [
  {
    category: 'Cost Optimization',
    icon: DollarSign,
    color: '#00ff88',
    items: [
      'Never hardcode model in cron payloads — omit and let agent defaults apply. This enables centralized routing control.',
      '9Router free-unlimited is $0 cost and performs comparably to Sonnet for most tasks. Use it as primary for all agents.',
      'ZAI models (zai/glm-4.7, glm-4.7-flashx) are PAYG — never use in crons or fallback chains. Only explicit calls.',
      'Ollama (qwen2.5-coder:7b) is $0 local inference. HATAKE uses it for internal intent parsing exclusively.',
      'Perplexity sonar-pro is subscription — RESEARCH only calls explicitly, never as default/fallback.',
    ],
  },
  {
    category: 'Agent Architecture',
    icon: Zap,
    color: '#00d4ff',
    items: [
      'Fallback chain: 9router/free-unlimited → 9router/heartbeat-cheap → openai-codex/gpt-5.2. All non-hatake agents use this.',
      'HATAKE is internal only — no Telegram bot. Used for intent parsing within the pipeline.',
      'A2A (agent-to-agent) flows: INFOSEC reviews L3 actions with 120s timeout before approval.',
      'Context pruning is active — agent sessions compress history to control token costs.',
      'Memory-core plugin injects SOUL.md + MEMORY.md into every session for consistent identity.',
    ],
  },
  {
    category: 'Security & Approvals',
    icon: Shield,
    color: '#ffaa00',
    items: [
      'L0–L2: Auto-approved. L3: INFOSEC A2A review. L4: Telegram approval (10 min). L5: Telegram approval (30 min).',
      'Never expose credentials in skills or committed files — only in n8n credential store or env.',
      'Three files must stay in sync with OPENCLAW_GATEWAY_TOKEN: openclaw.json, LaunchAgent plist, .zshrc.',
      'Never delete identity/device.json (Ed25519 keypair) — cannot be regenerated.',
      'Run `openclaw doctor` after every openclaw.json change — schema is strict.',
    ],
  },
  {
    category: 'Infrastructure',
    icon: Code,
    color: '#a78bfa',
    items: [
      'launchd manages all services: ai.openclaw.gateway, ai.openclaw.dashboard, ai.openclaw.n8n.',
      'Use `bash ~/.openclaw/scripts/redos-restart.sh` to restart full stack after config changes.',
      'n8n (port 5678) handles credential-isolated external API calls via webhook delegation.',
      'Dashboard runs on port 19000 with basic auth red/redos2026.',
      'Never edit /opt/homebrew/lib/node_modules/openclaw/dist/ — compiled runtime, do not touch.',
    ],
  },
  {
    category: 'Operations',
    icon: Lightbulb,
    color: '#ff3366',
    items: [
      'After significant changes: update workspace/MEMORY.md and commit to persist learnings.',
      'workspace/STATE.yaml is the live shared state — sprint, pipelines, metrics. Agents read it.',
      'workspace/AUTONOMOUS.md is the agent task queue — coordinate work between agents here.',
      'workspace/ops/TICKET-TRACKER.md tracks issues. TICKET format: TICK-XXX.',
      'Episodes.jsonl is seeded via python3 workspace/scripts/seed-episodes.py for memory retrieval.',
    ],
  },
]

export default function Learnings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Learnings</h1>
          <p className="text-xs text-gray-400 mt-0.5">Institutional knowledge base from workspace/ops/LEARNINGS.md</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <BookOpen size={12} />
          {LEARNINGS.reduce((s, l) => s + l.items.length, 0)} entries
        </div>
      </div>

      <div className="space-y-4">
        {LEARNINGS.map(section => {
          const Icon = section.icon
          return (
            <div key={section.category} className="bg-[#151932] border border-[#1e2645] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded flex items-center justify-center"
                  style={{ backgroundColor: `${section.color}20` }}>
                  <Icon size={13} style={{ color: section.color }} />
                </div>
                <h2 className="text-sm font-semibold" style={{ color: section.color }}>
                  {section.category}
                </h2>
              </div>
              <ul className="space-y-2.5">
                {section.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-gray-300">
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: section.color }}
                    />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
