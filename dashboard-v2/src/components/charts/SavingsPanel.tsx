import type { MissionControlSavings } from '../../types'

interface SavingsPanelProps {
  data: MissionControlSavings | null | undefined
}

function ProgressBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="w-full bg-[#1e2645] rounded-full h-2 overflow-hidden">
      <div
        className="h-2 rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}

export default function SavingsPanel({ data }: SavingsPanelProps) {
  if (!data) {
    return (
      <div className="text-gray-500 text-sm text-center py-8">No savings data</div>
    )
  }

  const savingsPct = data.savings_pct ?? 0
  const optScore = data.optimization_score ?? 0
  const cacheHit = data.cache_hit_rate_pct ?? 0
  const savingsUsd = data.savings_usd ?? data.monthly_projected_savings_usd ?? 0

  const scoreColor = optScore >= 80 ? '#00ff88' : optScore >= 60 ? '#ffaa00' : '#ff3366'
  const savingsColor = savingsPct >= 30 ? '#00ff88' : savingsPct >= 15 ? '#ffaa00' : '#00d4ff'

  return (
    <div className="space-y-4">
      {/* Main stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1e2645] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold" style={{ color: savingsColor }}>
            {savingsPct.toFixed(1)}%
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">vs Sonnet Baseline</div>
          <div className="mt-2">
            <ProgressBar value={savingsPct} max={100} color={savingsColor} />
          </div>
        </div>

        <div className="bg-[#1e2645] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold" style={{ color: scoreColor }}>
            {optScore.toFixed(0)}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Optimization Score</div>
          <div className="mt-2">
            <ProgressBar value={optScore} max={100} color={scoreColor} />
          </div>
        </div>
      </div>

      {/* Cache hit rate */}
      <div className="bg-[#1e2645] rounded-lg p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-400">Cache Hit Rate</span>
          <span className="text-sm font-bold text-[#00d4ff]">{cacheHit.toFixed(1)}%</span>
        </div>
        <ProgressBar value={cacheHit} max={100} color="#00d4ff" />
      </div>

      {/* Projected savings */}
      {savingsUsd > 0 && (
        <div className="bg-[#00ff88]/5 border border-[#00ff88]/20 rounded-lg p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-gray-400">Monthly Projected Savings</div>
            <div className="text-lg font-bold text-[#00ff88]">${savingsUsd.toFixed(2)}</div>
          </div>
          <div className="text-2xl">💰</div>
        </div>
      )}

      {/* Baseline note */}
      {data.baseline_cost_usd && (
        <div className="text-[10px] text-gray-600 text-center">
          Baseline (all-Sonnet): ${data.baseline_cost_usd.toFixed(4)}/day
        </div>
      )}
    </div>
  )
}
