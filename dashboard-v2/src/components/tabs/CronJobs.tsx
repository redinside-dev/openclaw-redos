import { useState } from 'react'
import { Clock, CheckCircle, XCircle, Search } from 'lucide-react'
import { useCronJobs } from '../../api'
import StatusBadge from '../StatusBadge'

function formatLastRun(ts: string | undefined): string {
  if (!ts) return 'Never'
  const d = new Date(ts)
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function CronJobs() {
  const cronJobs = useCronJobs()
  const [filter, setFilter] = useState('')
  const [showDisabled, setShowDisabled] = useState(true)

  const allJobs = cronJobs.data ?? []
  const enabledCount = allJobs.filter(j => j.enabled).length
  const disabledCount = allJobs.filter(j => !j.enabled).length

  const filtered = allJobs.filter(job => {
    const matchFilter = !filter || job.name.toLowerCase().includes(filter.toLowerCase()) ||
      (job.agent ?? '').toLowerCase().includes(filter.toLowerCase()) ||
      (job.schedule ?? '').toLowerCase().includes(filter.toLowerCase())
    const matchEnabled = showDisabled || job.enabled
    return matchFilter && matchEnabled
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Cron Jobs</h1>
          <p className="text-xs text-gray-400 mt-0.5">Scheduled task management — auto-refresh 60s</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{allJobs.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">Total Jobs</div>
        </div>
        <div className="bg-[#151932] border border-[#00ff88]/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[#00ff88]">{enabledCount}</div>
          <div className="text-xs text-gray-400 mt-0.5">Enabled</div>
        </div>
        <div className="bg-[#151932] border border-[#ff3366]/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[#ff3366]">{disabledCount}</div>
          <div className="text-xs text-gray-400 mt-0.5">Disabled</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="w-full bg-[#151932] border border-[#1e2645] text-white text-xs rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-[#00d4ff]"
            placeholder="Filter by name, agent, schedule…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showDisabled}
            onChange={e => setShowDisabled(e.target.checked)}
            className="w-3 h-3"
          />
          Show disabled
        </label>
      </div>

      {/* Table */}
      <div className="bg-[#151932] border border-[#1e2645] rounded-xl overflow-hidden">
        {cronJobs.isLoading ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">Loading cron jobs…</div>
        ) : cronJobs.error ? (
          <div className="px-4 py-8 text-center">
            <div className="text-[#ffaa00] text-sm mb-1">Cron jobs endpoint unavailable</div>
            <div className="text-gray-500 text-xs">The /api/cron-jobs endpoint may not be active</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Clock size={32} className="mx-auto mb-3 text-gray-700" />
            <div className="text-gray-500 text-sm">No cron jobs found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1e2645]">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Schedule</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Agent</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Enabled</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Last Run</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((job, i) => (
                  <tr key={job.id ?? job.name ?? i}
                    className="border-b border-[#1e2645] hover:bg-[#1e2645]/30 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{job.name}</td>
                    <td className="px-4 py-3 font-mono text-[#00d4ff] text-[10px]">{job.schedule}</td>
                    <td className="px-4 py-3 text-gray-400">{job.agent ?? job.agentId ?? '—'}</td>
                    <td className="px-4 py-3">
                      {job.enabled ? (
                        <span className="flex items-center gap-1 text-[#00ff88]">
                          <CheckCircle size={12} /> Yes
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-500">
                          <XCircle size={12} /> No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{formatLastRun(job.lastRun)}</td>
                    <td className="px-4 py-3">
                      {job.status ? (
                        <StatusBadge status={job.status} />
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-[#1e2645] text-[10px] text-gray-600">
              Showing {filtered.length} of {allJobs.length} jobs
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
