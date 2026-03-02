import { useState, useRef, useEffect } from 'react'
import { AlertCircle, RefreshCw, Filter } from 'lucide-react'
import { useErrors, useGatewayErrors, useGatewayLogs } from '../../api'
import StatusBadge from '../StatusBadge'
import type { GatewayLog } from '../../types'

function formatTs(ts: string | undefined): string {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function getLogLine(entry: string | GatewayLog): string {
  if (typeof entry === 'string') return entry
  return entry.line ?? entry.message ?? JSON.stringify(entry)
}

function getLogLevel(line: string): string {
  const l = line.toLowerCase()
  if (l.includes('error') || l.includes('err:')) return 'error'
  if (l.includes('warn')) return 'warn'
  if (l.includes('info')) return 'info'
  if (l.includes('debug')) return 'debug'
  return 'log'
}

function levelColor(level: string): string {
  switch (level) {
    case 'error': return '#ff3366'
    case 'warn':  return '#ffaa00'
    case 'info':  return '#00d4ff'
    case 'debug': return '#6b7280'
    default:      return '#9ca3af'
  }
}

export default function ErrorsLogs() {
  const errors = useErrors()
  const gatewayErrors = useGatewayErrors()
  const gatewayLogs = useGatewayLogs()
  const [tab, setTab] = useState<'logs' | 'errors'>('logs')
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const logRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  const allErrors = [
    ...(errors.data ?? []),
    ...(gatewayErrors.data ?? []),
  ]

  const logLines: Array<string | GatewayLog> = gatewayLogs.data ?? []

  // Auto-scroll log output
  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logLines, autoScroll])

  const filteredLogs = logLines.filter(entry => {
    if (filterLevel === 'all') return true
    const line = getLogLine(entry)
    return getLogLevel(line) === filterLevel
  })

  const isLoading = gatewayLogs.isLoading || errors.isLoading

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Errors & Logs</h1>
          <p className="text-xs text-gray-400 mt-0.5">Live gateway log tail — auto-refresh 5s</p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshCw size={12} className={`text-gray-500 ${isLoading ? 'animate-spin text-[#00d4ff]' : ''}`} />
          <span className="text-xs text-gray-500">5s refresh</span>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        {(['logs', 'errors'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              tab === t
                ? 'bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/30'
                : 'text-gray-400 border border-[#1e2645] hover:border-[#2a3558]'
            }`}
          >
            {t === 'logs' ? 'Gateway Logs' : `Errors (${allErrors.length})`}
          </button>
        ))}
      </div>

      {tab === 'logs' && (
        <div className="space-y-3">
          {/* Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter size={12} className="text-gray-500" />
              <span className="text-xs text-gray-500">Level:</span>
            </div>
            {['all', 'error', 'warn', 'info', 'debug', 'log'].map(level => (
              <button
                key={level}
                onClick={() => setFilterLevel(level)}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                  filterLevel === level
                    ? 'font-semibold'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
                style={filterLevel === level ? { color: levelColor(level) } : {}}
              >
                {level}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={e => setAutoScroll(e.target.checked)}
                  className="w-3 h-3"
                />
                Auto-scroll
              </label>
            </div>
          </div>

          {/* Log output */}
          <div
            ref={logRef}
            className="bg-[#0a0e1a] border border-[#1e2645] rounded-xl p-4 h-[500px] overflow-y-auto log-output"
            onScroll={e => {
              const el = e.currentTarget
              const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50
              setAutoScroll(atBottom)
            }}
          >
            {gatewayLogs.isLoading ? (
              <div className="text-gray-500">Connecting to log stream…</div>
            ) : gatewayLogs.error ? (
              <div className="text-[#ff3366]">
                Gateway logs unavailable — /api/gateway-logs returned an error
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-gray-600">No log entries available</div>
            ) : (
              filteredLogs.map((entry, i) => {
                const line = getLogLine(entry)
                const level = getLogLevel(line)
                const color = levelColor(level)
                return (
                  <div key={i} className="flex gap-2 leading-relaxed">
                    <span style={{ color }} className="flex-shrink-0 text-[10px] select-none w-10">
                      [{level.slice(0, 4).toUpperCase()}]
                    </span>
                    <span style={{ color: level === 'error' ? '#ff3366' : level === 'warn' ? '#ffaa00' : '#9ca3af' }}
                      className="break-all">
                      {line}
                    </span>
                  </div>
                )
              })
            )}
          </div>

          {filteredLogs.length > 0 && (
            <div className="text-[10px] text-gray-600 text-right">
              {filteredLogs.length} lines
            </div>
          )}
        </div>
      )}

      {tab === 'errors' && (
        <div className="bg-[#151932] border border-[#1e2645] rounded-xl overflow-hidden">
          {errors.isLoading ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">Loading errors…</div>
          ) : allErrors.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <AlertCircle size={32} className="mx-auto mb-3 text-gray-700" />
              <div className="text-[#00ff88] text-sm font-medium">No errors — all systems nominal</div>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1e2645]">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Time</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Level</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Agent</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Message</th>
                </tr>
              </thead>
              <tbody>
                {allErrors.slice(0, 50).map((err, i) => (
                  <tr key={err.id ?? i} className="border-b border-[#1e2645] hover:bg-[#1e2645]/30">
                    <td className="px-4 py-3 text-gray-500 font-mono text-[10px] whitespace-nowrap">
                      {formatTs(err.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={err.level ?? err.type ?? 'error'} />
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {err.agent ?? err.agentId ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      <div className="truncate max-w-lg" title={err.message}>{err.message}</div>
                      {err.stack && (
                        <details className="mt-1">
                          <summary className="text-[10px] text-gray-600 cursor-pointer">Stack trace</summary>
                          <pre className="text-[9px] text-gray-600 mt-1 font-mono whitespace-pre-wrap">
                            {err.stack.slice(0, 500)}
                          </pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
