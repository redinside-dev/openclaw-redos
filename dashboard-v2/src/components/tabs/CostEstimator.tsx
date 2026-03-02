import React, { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useAnalytics, useMissionCosts, useMissionSavings, useMissionSubscriptions } from '../../api'
import SpendGauge from '../charts/SpendGauge'
import ModelPie from '../charts/ModelPie'
import CostByAgent from '../charts/CostByAgent'
import BurnRate from '../charts/BurnRate'
import SavingsPanel from '../charts/SavingsPanel'
import type { CostByEntry, DailyBurnEntry } from '../../types'

const DAILY_LIMIT = 2.0

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#151932] border border-[#1e2645] rounded-xl p-4 ${className}`}>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{title}</h3>
      {children}
    </div>
  )
}

export default function CostEstimator() {
  const analytics = useAnalytics()
  const costs = useMissionCosts(30)
  const savings = useMissionSavings(30)
  const subs = useMissionSubscriptions()

  const [days, setDays] = useState(30)

  const today = analytics.data?.today
  const todayCost = today?.total ?? 0
  const todayRequests = today?.requests ?? 0

  // Build model pie data from API or analytics fallback
  const modelData = (costs.data?.by_model?.length
    ? costs.data.by_model
    : Object.entries(today?.byModel ?? {}).map(([name, cost]) => ({ name, cost: cost as number }))
  ).map(d => ({ name: d.name, value: d.cost }))

  // Build agent bar data
  const agentData: CostByEntry[] = costs.data?.by_agent?.length
    ? costs.data.by_agent
    : Object.entries(today?.byAgent ?? {}).map(([name, cost]) => ({ name, cost: cost as number }))

  // Build burn rate data
  const burnData: DailyBurnEntry[] = costs.data?.daily_burn ?? []

  const totalCost30d = costs.data?.total_cost_usd ?? 0

  const isLoading = analytics.isLoading || costs.isLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Cost Estimator</h1>
          <p className="text-xs text-gray-400 mt-0.5">Real-time spend analysis — auto-refresh 10s</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="bg-[#151932] border border-[#1e2645] text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#00d4ff]"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <RefreshCw size={12} className={isLoading ? 'animate-spin text-[#00d4ff]' : ''} />
            {isLoading ? 'Refreshing…' : '10s'}
          </div>
        </div>
      </div>

      {/* Top row: summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-4">
          <div className="text-xs text-gray-400">Today's Spend</div>
          <div className={`text-2xl font-bold mt-1 ${todayCost > DAILY_LIMIT ? 'text-[#ff3366]' : todayCost > DAILY_LIMIT * 0.7 ? 'text-[#ffaa00]' : 'text-[#00ff88]'}`}>
            ${todayCost.toFixed(4)}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            of ${DAILY_LIMIT.toFixed(2)} limit
          </div>
        </div>

        <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-4">
          <div className="text-xs text-gray-400">Today's Requests</div>
          <div className="text-2xl font-bold text-white mt-1">
            {todayRequests.toLocaleString()}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">API calls processed</div>
        </div>

        <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-4">
          <div className="text-xs text-gray-400">{days}d Total Spend</div>
          <div className="text-2xl font-bold text-[#00d4ff] mt-1">
            ${totalCost30d.toFixed(4)}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            avg ${(totalCost30d / days).toFixed(4)}/day
          </div>
        </div>

        <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-4">
          <div className="text-xs text-gray-400">Monthly Fixed Costs</div>
          <div className="text-2xl font-bold text-[#ffaa00] mt-1">
            ${(subs.data?.total_fixed_monthly_usd ?? 0).toFixed(2)}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            {subs.data?.subscriptions?.length ?? 0} subscriptions
          </div>
        </div>
      </div>

      {/* Chart row 1: Gauge + Model Pie */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Daily Spend Gauge">
          <div className="flex flex-col items-center">
            <SpendGauge spent={todayCost} limit={DAILY_LIMIT} label="vs $2.00 Daily Limit" />
            <div className="mt-2 grid grid-cols-3 gap-2 w-full text-center text-[10px]">
              <div>
                <div className="w-3 h-1.5 rounded bg-[#00ff88] mx-auto mb-0.5" />
                <span className="text-gray-500">Safe (&lt;70%)</span>
              </div>
              <div>
                <div className="w-3 h-1.5 rounded bg-[#ffaa00] mx-auto mb-0.5" />
                <span className="text-gray-500">Warning (70–90%)</span>
              </div>
              <div>
                <div className="w-3 h-1.5 rounded bg-[#ff3366] mx-auto mb-0.5" />
                <span className="text-gray-500">Over (90%+)</span>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Cost by Model / Tier">
          {modelData.length === 0 ? (
            <div className="flex items-center justify-center h-44 text-gray-500 text-sm">No model data</div>
          ) : (
            <ModelPie data={modelData} />
          )}
        </Card>
      </div>

      {/* Chart row 2: Cost by Agent */}
      <Card title="Cost by Agent">
        {agentData.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">No agent cost data</div>
        ) : (
          <CostByAgent data={agentData} />
        )}
      </Card>

      {/* Chart row 3: Burn Rate */}
      <Card title={`${days}-Day Burn Rate (vs $1.00/day target)`}>
        {burnData.length === 0 && !costs.isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-center">
              <div className="text-gray-500 text-sm mb-1">No burn rate data available</div>
              <div className="text-gray-600 text-[10px]">Mission control costs endpoint may be offline</div>
            </div>
          </div>
        ) : (
          <BurnRate data={burnData} targetUsd={1.0} />
        )}
      </Card>

      {/* Savings Panel */}
      <Card title="Savings vs All-Sonnet Baseline">
        <SavingsPanel data={savings.data} />
      </Card>

      {/* Subscriptions table */}
      {subs.data?.subscriptions && subs.data.subscriptions.length > 0 && (
        <Card title="Active Subscriptions">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1e2645]">
                <th className="text-left py-2 text-gray-400 font-medium">Service</th>
                <th className="text-left py-2 text-gray-400 font-medium">Description</th>
                <th className="text-right py-2 text-gray-400 font-medium">Cost/mo</th>
              </tr>
            </thead>
            <tbody>
              {subs.data.subscriptions.map((sub, i) => (
                <tr key={i} className="border-b border-[#1e2645]">
                  <td className="py-2.5 text-white font-medium">{sub.name}</td>
                  <td className="py-2.5 text-gray-400">{sub.description ?? sub.billing_cycle ?? '—'}</td>
                  <td className="py-2.5 text-right text-[#ffaa00] font-mono">${sub.cost_usd.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-[#1e2645]">
                <td colSpan={2} className="py-2 text-gray-400 font-medium">Total Fixed Monthly</td>
                <td className="py-2 text-right text-[#ffaa00] font-bold font-mono">
                  ${subs.data.total_fixed_monthly_usd.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
