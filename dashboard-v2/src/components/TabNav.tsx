import React from 'react'
import {
  LayoutDashboard, Users, GitBranch, Calendar, Clock,
  AlertTriangle, BookOpen, Zap, DollarSign, Route,
  MessageSquare, Database, Terminal, ExternalLink, Crown, Search,
  ChevronLeft, ChevronRight, Activity,
} from 'lucide-react'

export type TabId =
  | 'overview' | 'agents' | 'pipeline' | 'standup' | 'cron-jobs'
  | 'tickets' | 'learnings' | 'skills' | 'cost-estimator' | 'smart-routing'
  | 'prompt-eng' | 'caching' | 'errors-logs' | 'openclaw-embed'
  | 'ceo-controls' | 'search'

interface Tab {
  id: TabId
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const tabs: Tab[] = [
  { id: 'overview',       label: 'Overview',      icon: LayoutDashboard },
  { id: 'agents',         label: 'Agents',        icon: Users },
  { id: 'pipeline',       label: 'Pipeline',      icon: GitBranch },
  { id: 'standup',        label: 'Standup',       icon: Calendar },
  { id: 'cron-jobs',      label: 'Cron Jobs',     icon: Clock },
  { id: 'tickets',        label: 'Tickets & SLA', icon: AlertTriangle },
  { id: 'learnings',      label: 'Learnings',     icon: BookOpen },
  { id: 'skills',         label: 'Skills',        icon: Zap },
  { id: 'cost-estimator', label: 'Cost Estimator',icon: DollarSign },
  { id: 'smart-routing',  label: 'Smart Routing', icon: Route },
  { id: 'prompt-eng',     label: 'Prompt Eng',    icon: MessageSquare },
  { id: 'caching',        label: 'Caching',       icon: Database },
  { id: 'errors-logs',    label: 'Errors & Logs', icon: Terminal },
  { id: 'openclaw-embed', label: 'OpenClaw',      icon: ExternalLink },
  { id: 'ceo-controls',   label: 'CEO Controls',  icon: Crown },
  { id: 'search',         label: 'Search',        icon: Search },
]

interface TabNavProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export default function TabNav({ activeTab, onTabChange }: TabNavProps) {
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <nav
      className={`flex flex-col flex-shrink-0 bg-[#151932] border-r border-[#1e2645] transition-all duration-300 ${collapsed ? 'w-14' : 'w-52'}`}
      style={{ height: '100vh', overflowY: 'auto', overflowX: 'hidden' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-[#1e2645] flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <Activity size={16} className="text-[#00d4ff] flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#00d4ff] tracking-wider truncate">OPENCLAW</div>
              <div className="text-[10px] text-gray-500 truncate">RedOS Mission Control</div>
            </div>
          </div>
        )}
        {collapsed && <Activity size={16} className="text-[#00d4ff] mx-auto" />}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="text-gray-500 hover:text-[#00d4ff] transition-colors flex-shrink-0 ml-1"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Tab list */}
      <div className="flex-1 py-2">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              title={collapsed ? tab.label : undefined}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-150 relative
                ${isActive
                  ? 'text-[#00d4ff] bg-[#00d4ff]/10 border-r-2 border-[#00d4ff]'
                  : 'text-gray-400 hover:text-white hover:bg-[#1e2645]/50'
                }
              `}
            >
              <Icon size={16} className={`flex-shrink-0 ${isActive ? 'text-[#00d4ff]' : ''}`} />
              {!collapsed && (
                <span className="text-xs font-medium truncate">{tab.label}</span>
              )}
              {!collapsed && isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00d4ff] flex-shrink-0 status-pulse" />
              )}
              {/* Tab number */}
              {!collapsed && (
                <span className="absolute right-6 text-[10px] text-gray-600 font-mono">{idx + 1}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[#1e2645] flex-shrink-0">
        {!collapsed ? (
          <div className="text-[10px] text-gray-600">
            <div className="text-[#00d4ff]/60 font-mono">PORT 19000</div>
            <div className="mt-0.5">RedOS v2.0</div>
          </div>
        ) : (
          <div className="text-[10px] text-gray-600 text-center font-mono">v2</div>
        )}
      </div>
    </nav>
  )
}
