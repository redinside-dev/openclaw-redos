import { CheckCircle } from 'lucide-react'
import { usePromptEngineering } from '../../api'

const STATIC_PIPELINE = [
  {
    id: 'input',
    name: 'User Input',
    type: 'source',
    description: 'Raw message received from Telegram, Slack, or direct API call',
    color: '#00d4ff',
  },
  {
    id: 'routing',
    name: 'Intent Routing (HATAKE)',
    type: 'routing',
    description: 'HATAKE (ollama/qwen2.5-coder:7b) parses intent and routes to appropriate agent',
    color: '#a78bfa',
  },
  {
    id: 'context',
    name: 'Context Assembly',
    type: 'processing',
    description: 'memory-core plugin injects SOUL.md + MEMORY.md + STATE.yaml snapshot',
    color: '#00ff88',
  },
  {
    id: 'pruning',
    name: 'Context Pruning',
    type: 'processing',
    description: 'session history compressed to control token costs while retaining key context',
    color: '#00ff88',
  },
  {
    id: 'skill-apply',
    name: 'Skill Application',
    type: 'processing',
    description: 'Relevant SKILL.md definitions applied as system prompt additions',
    color: '#ffaa00',
  },
  {
    id: 'maker-checker',
    name: 'Maker-Checker (L3+)',
    type: 'security',
    description: 'Actions at L3+ trigger INFOSEC A2A review or Telegram approval before execution',
    color: '#ff3366',
  },
  {
    id: 'model-call',
    name: 'Model Call (9Router)',
    type: 'llm',
    description: '9router/free-unlimited with auto-failover to heartbeat-cheap → gpt-5.2',
    color: '#00d4ff',
  },
  {
    id: 'analytics',
    name: 'LLM Analytics',
    type: 'telemetry',
    description: 'llm-analytics plugin captures tokens, cost, latency → workspace/logs/*.jsonl',
    color: '#6b7280',
  },
  {
    id: 'response',
    name: 'Response Delivery',
    type: 'output',
    description: 'Formatted response sent back to originating channel (Telegram/Slack)',
    color: '#00d4ff',
  },
]

const TYPE_ICONS: Record<string, string> = {
  source: '📥',
  routing: '🔀',
  processing: '⚙️',
  security: '🛡️',
  llm: '🤖',
  telemetry: '📊',
  output: '📤',
}

export default function PromptEng() {
  const promptData = usePromptEngineering()

  const steps = promptData.data?.pipeline ?? promptData.data?.steps ?? STATIC_PIPELINE

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Prompt Engineering</h1>
          <p className="text-xs text-gray-400 mt-0.5">Processing pipeline and prompt construction flow</p>
        </div>
      </div>

      {/* Pipeline flow */}
      <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-5">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">
          Request Processing Pipeline
        </h2>
        <div className="space-y-2">
          {steps.map((step, i) => {
            const staticStep = STATIC_PIPELINE[i]
            const color = staticStep?.color ?? '#00d4ff'
            const icon = TYPE_ICONS[step.type ?? ''] ?? '▸'
            const isLast = i === steps.length - 1
            return (
              <div key={step.id ?? step.name ?? i}>
                <div className="flex items-start gap-3">
                  {/* Step number + icon */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border"
                      style={{ borderColor: `${color}40`, backgroundColor: `${color}15`, color }}
                    >
                      {icon}
                    </div>
                    {!isLast && (
                      <div className="w-0.5 h-4 bg-[#1e2645] mt-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{step.name}</span>
                      {step.type && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1e2645] text-gray-500 uppercase">
                          {step.type}
                        </span>
                      )}
                      {'enabled' in step && step.enabled === false && (
                        <span className="text-[9px] text-[#ff3366]">disabled</span>
                      )}
                    </div>
                    {step.description && (
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* System prompt components */}
      <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-5">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          System Prompt Components
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { file: 'workspace/SOUL.md', desc: 'Company OS — core identity, values, operating principles. Injected into every session.', required: true },
            { file: 'workspace/MEMORY.md', desc: 'Curated long-term memory. Key decisions, learnings, preferences. Updated by RED.', required: true },
            { file: 'workspace/GOALS.md', desc: 'Active company goals. Only RED writes. Agents reference for alignment.', required: false },
            { file: 'workspace/STATE.yaml', desc: 'Live shared state — sprint, pipelines, metrics. Read-only for most agents.', required: false },
            { file: 'workspace/skills/*.SKILL.md', desc: 'Relevant skill definitions activated per request context.', required: false },
            { file: 'workspace/AUTONOMOUS.md', desc: 'Agent task queue for coordinated autonomous work.', required: false },
          ].map(item => (
            <div key={item.file} className="bg-[#1e2645] rounded-lg p-3 flex items-start gap-2">
              <CheckCircle size={12} className={item.required ? 'text-[#00d4ff]' : 'text-[#00ff88]'} />
              <div>
                <div className="text-[10px] font-mono text-white">{item.file}</div>
                <div className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{item.desc}</div>
                {item.required && (
                  <div className="text-[9px] text-[#00d4ff] mt-0.5">always injected</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live templates from API */}
      {promptData.data?.templates && promptData.data.templates.length > 0 && (
        <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Prompt Templates
          </h2>
          <div className="space-y-3">
            {promptData.data.templates.map((tmpl, i) => (
              <div key={i} className="bg-[#1e2645] rounded-lg p-3">
                <div className="text-xs font-semibold text-white mb-1">{tmpl.name}</div>
                <pre className="text-[10px] text-gray-400 font-mono whitespace-pre-wrap overflow-auto max-h-32">
                  {tmpl.content}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
