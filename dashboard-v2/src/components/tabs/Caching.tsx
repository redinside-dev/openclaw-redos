import { Database } from 'lucide-react'
import { useCaching } from '../../api'

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-[#0a0e1a] rounded-full h-2.5 overflow-hidden">
      <div
        className="h-2.5 rounded-full transition-all duration-700"
        style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
      />
    </div>
  )
}

function Stat({ label, value, sub, color = '#fff' }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="bg-[#1e2645] rounded-xl p-4">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      {sub && <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function Caching() {
  const caching = useCaching()
  const data = caching.data

  const hitRate = data?.hitRate ?? data?.hit_rate ?? 0
  const size = data?.size ?? data?.entries ?? 0
  const maxSize = data?.maxSize ?? 10000
  const ttl = data?.ttl ?? 3600
  const enabled = data?.enabled ?? true

  const fillPct = maxSize > 0 ? (size / maxSize) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Caching</h1>
          <p className="text-xs text-gray-400 mt-0.5">Cache configuration and performance metrics</p>
        </div>
        <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border ${
          enabled
            ? 'text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/30'
            : 'text-gray-400 bg-gray-400/10 border-gray-400/30'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${enabled ? 'bg-[#00ff88] status-pulse' : 'bg-gray-500'}`} />
          {enabled ? 'Cache Active' : 'Cache Disabled'}
        </div>
      </div>

      {caching.isLoading ? (
        <div className="text-gray-500 text-sm">Loading cache data…</div>
      ) : caching.error ? (
        <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-8 text-center">
          <Database size={32} className="mx-auto mb-3 text-gray-700" />
          <div className="text-[#ffaa00] text-sm mb-1">Cache endpoint unavailable</div>
          <div className="text-gray-500 text-xs">The /api/caching endpoint may not be active</div>

          {/* Static info */}
          <div className="mt-6 text-left max-w-md mx-auto">
            <div className="text-xs text-gray-400 mb-3">Default cache configuration:</div>
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex justify-between"><span>Provider</span><span className="text-gray-300">In-memory / Redis</span></div>
              <div className="flex justify-between"><span>TTL</span><span className="text-gray-300">3600s (1h)</span></div>
              <div className="flex justify-between"><span>Cache type</span><span className="text-gray-300">Prompt + response</span></div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Hit Rate" value={`${hitRate.toFixed(1)}%`} color="#00ff88" />
            <Stat label="Cache Entries" value={size.toLocaleString()} sub={`of ${maxSize.toLocaleString()} max`} color="#00d4ff" />
            <Stat label="TTL" value={`${ttl}s`} sub={`${(ttl / 3600).toFixed(1)}h`} />
            <Stat label="Fill Rate" value={`${fillPct.toFixed(1)}%`} color={fillPct > 90 ? '#ff3366' : fillPct > 70 ? '#ffaa00' : '#00ff88'} />
          </div>

          {/* Hit rate bar */}
          <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-white">Cache Hit Rate</span>
              <span className="text-sm font-bold text-[#00ff88]">{hitRate.toFixed(1)}%</span>
            </div>
            <ProgressBar value={hitRate} color="#00ff88" />
            <div className="flex justify-between mt-1 text-[10px] text-gray-500">
              <span>0%</span>
              <span>Target: 60%+</span>
              <span>100%</span>
            </div>
          </div>

          {/* Fill rate bar */}
          <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-white">Cache Fill Rate</span>
              <span className="text-sm font-bold" style={{ color: fillPct > 90 ? '#ff3366' : '#00d4ff' }}>
                {fillPct.toFixed(1)}%
              </span>
            </div>
            <ProgressBar value={fillPct} color={fillPct > 90 ? '#ff3366' : fillPct > 70 ? '#ffaa00' : '#00d4ff'} />
          </div>

          {/* Config details */}
          {data?.config && (
            <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-4">
              <h2 className="text-xs font-semibold text-white mb-3">Cache Configuration</h2>
              <div className="bg-[#0a0e1a] rounded-lg p-3">
                <pre className="text-[10px] font-mono text-gray-400 overflow-auto">
                  {JSON.stringify(data.config, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
