import React, { useState } from 'react'
import { GitBranch, ChevronDown, ChevronUp } from 'lucide-react'
import { usePipeline } from '../../api'
import type { PipelineRequest } from '../../types'

function formatTs(ts: string | undefined): string {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatLatency(ms: number | undefined): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function ExpandedTrace({ req }: { req: PipelineRequest }) {
  const steps = req.trace ?? req.steps ?? []
  return (
    <tr className="bg-[#0d1120]">
      <td colSpan={7} className="px-4 py-4">
        <div className="space-y-2">
          {/* Full message */}
          <div>
            <span className="text-[10px] text-gray-400">Full Message:</span>
            <div className="text-xs text-gray-300 mt-1 bg-[#1e2645] rounded px-3 py-2 font-mono">
              {req.input ?? req.message ?? '—'}
            </div>
          </div>

          {/* Trace steps */}
          {steps.length > 0 && (
            <div>
              <span className="text-[10px] text-gray-400">Trace Steps ({steps.length}):</span>
              <div className="mt-1 space-y-1">
                {steps.map((step, i) => (
                  <div key={i} className="bg-[#1e2645] rounded px-3 py-2 text-[10px]">
                    <div className="flex items-center gap-3 text-gray-400">
                      <span className="text-[#00d4ff]">Step {i + 1}</span>
                      {step.model && <span>{step.model}</span>}
                      {step.latencyMs && <span>{formatLatency(step.latencyMs)}</span>}
                      {step.tokens && <span>{step.tokens.toLocaleString()} tokens</span>}
                      {step.cost && <span className="text-[#ffaa00]">${step.cost.toFixed(6)}</span>}
                    </div>
                    {(step.response ?? step.output) && (
                      <div className="mt-1 text-gray-300 truncate max-w-3xl font-mono">
                        {(step.response ?? step.output ?? '').slice(0, 200)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Model info */}
          {req.model && (
            <div className="flex items-center gap-4 text-[10px] text-gray-400">
              <span>Model: <span className="text-[#00d4ff]">{req.model}</span></span>
              {req.tokens && <span>Tokens: <span className="text-white">{req.tokens.toLocaleString()}</span></span>}
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function Pipeline() {
  const pipeline = usePipeline()
  const [expanded, setExpanded] = useState<string | null>(null)

  const requests = (pipeline.data ?? []).slice(0, 25)

  const toggleRow = (id: string) => {
    setExpanded(prev => prev === id ? null : id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Pipeline</h1>
          <p className="text-xs text-gray-400 mt-0.5">Last 25 requests — click row to expand trace</p>
        </div>
        <div className="text-xs text-gray-500">
          {requests.length} requests · auto-refresh 15s
        </div>
      </div>

      <div className="bg-[#151932] border border-[#1e2645] rounded-xl overflow-hidden">
        {pipeline.isLoading ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">Loading pipeline…</div>
        ) : pipeline.error ? (
          <div className="px-4 py-8 text-center text-[#ff3366] text-sm">Failed to load pipeline data</div>
        ) : requests.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <GitBranch size={32} className="mx-auto mb-3 text-gray-700" />
            <div className="text-gray-500 text-sm">No pipeline data</div>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1e2645]">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">REQ-ID</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Agent</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Message</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Model</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Latency</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Cost</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req, i) => {
                const id = req.id ?? req.reqId ?? String(i)
                const isOpen = expanded === id
                return (
                  <React.Fragment key={id}>
                    <tr
                      className={`border-b border-[#1e2645] cursor-pointer transition-colors
                        ${isOpen ? 'bg-[#1e2645]' : 'hover:bg-[#1e2645]/50'}`}
                      onClick={() => toggleRow(id)}
                    >
                      <td className="px-4 py-3 font-mono text-[#00d4ff]">
                        {id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {req.agent ?? req.agentId ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 max-w-xs">
                        <span className="truncate block" title={req.input ?? req.message}>
                          {(req.input ?? req.message ?? '').slice(0, 60)}
                          {(req.input ?? req.message ?? '').length > 60 ? '…' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-gray-400">
                        {req.model ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-white">
                        {formatLatency(req.latencyMs)}
                      </td>
                      <td className="px-4 py-3 text-[#ffaa00]">
                        {req.costUsd != null ? `$${req.costUsd.toFixed(6)}` :
                         req.cost != null ? `$${req.cost.toFixed(6)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 flex items-center gap-1">
                        {formatTs(req.timestamp ?? req.createdAt)}
                        {isOpen ? <ChevronUp size={12} className="text-[#00d4ff]" /> : <ChevronDown size={12} />}
                      </td>
                    </tr>
                    {isOpen && <ExpandedTrace req={req} />}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
