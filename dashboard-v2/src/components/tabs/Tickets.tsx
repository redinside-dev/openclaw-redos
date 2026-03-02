import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useTickets } from '../../api'
import StatusBadge from '../StatusBadge'
import type { TicketSeverity, TicketStatus } from '../../types'

function formatDate(ts: string | undefined): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const SEVERITY_ORDER: Record<TicketSeverity, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
}

export default function Tickets() {
  const tickets = useTickets()
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all')
  const [filterSeverity, setFilterSeverity] = useState<TicketSeverity | 'all'>('all')

  const allTickets = tickets.data ?? []

  const open = allTickets.filter(t => t.status === 'open').length
  const inProgress = allTickets.filter(t => t.status === 'in-progress').length
  const resolved = allTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length

  // Simple SLA breach check: open for more than 24h without resolution
  const breached = allTickets.filter(t => {
    if (t.status === 'resolved' || t.status === 'closed') return false
    const age = Date.now() - new Date(t.createdAt || 0).getTime()
    const limit = t.severity === 'critical' ? 4 * 3600000 :
                  t.severity === 'high' ? 24 * 3600000 :
                  t.severity === 'medium' ? 72 * 3600000 : 7 * 24 * 3600000
    return age > limit
  }).length

  const filtered = allTickets
    .filter(t => filterStatus === 'all' || t.status === filterStatus)
    .filter(t => filterSeverity === 'all' || t.severity === filterSeverity)
    .sort((a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4)
    )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Tickets & SLA</h1>
          <p className="text-xs text-gray-400 mt-0.5">Issue tracking and SLA compliance — auto-refresh 30s</p>
        </div>
      </div>

      {/* SLA Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[#00d4ff]">{open}</div>
          <div className="text-xs text-gray-400 mt-0.5">Open</div>
        </div>
        <div className="bg-[#151932] border border-[#ffaa00]/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[#ffaa00]">{inProgress}</div>
          <div className="text-xs text-gray-400 mt-0.5">In Progress</div>
        </div>
        <div className="bg-[#151932] border border-[#ff3366]/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[#ff3366]">{breached}</div>
          <div className="text-xs text-gray-400 mt-0.5">SLA Breached</div>
        </div>
        <div className="bg-[#151932] border border-[#00ff88]/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[#00ff88]">{resolved}</div>
          <div className="text-xs text-gray-400 mt-0.5">Resolved</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as TicketStatus | 'all')}
          className="bg-[#151932] border border-[#1e2645] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#00d4ff]"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={filterSeverity}
          onChange={e => setFilterSeverity(e.target.value as TicketSeverity | 'all')}
          className="bg-[#151932] border border-[#1e2645] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#00d4ff]"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#151932] border border-[#1e2645] rounded-xl overflow-hidden">
        {tickets.isLoading ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">Loading tickets…</div>
        ) : tickets.error ? (
          <div className="px-4 py-8 text-center text-[#ff3366] text-sm">Failed to load tickets</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <AlertTriangle size={32} className="mx-auto mb-3 text-gray-700" />
            <div className="text-gray-500 text-sm">No tickets found</div>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1e2645]">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">ID</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Title</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Severity</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Created</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">SLA</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ticket => (
                <tr key={ticket.id}
                  className="border-b border-[#1e2645] hover:bg-[#1e2645]/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-[#00d4ff]">{ticket.id}</td>
                  <td className="px-4 py-3 text-white">
                    <div className="truncate max-w-xs" title={ticket.title}>{ticket.title}</div>
                    {ticket.description && (
                      <div className="text-gray-500 text-[10px] truncate">{ticket.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={ticket.severity} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(ticket.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-400">{ticket.sla ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
