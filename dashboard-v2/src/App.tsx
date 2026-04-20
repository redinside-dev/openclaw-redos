import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import TabNav, { type TabId } from './components/TabNav'
import Overview from './components/tabs/Overview'
import Agents from './components/tabs/Agents'
import Pipeline from './components/tabs/Pipeline'
import Standup from './components/tabs/Standup'
import CronJobs from './components/tabs/CronJobs'
import Tickets from './components/tabs/Tickets'
import Learnings from './components/tabs/Learnings'
import Skills from './components/tabs/Skills'
import CostEstimator from './components/tabs/CostEstimator'
import SmartRouting from './components/tabs/SmartRouting'
import PromptEng from './components/tabs/PromptEng'
import Caching from './components/tabs/Caching'
import ErrorsLogs from './components/tabs/ErrorsLogs'
import OpenClawEmbed from './components/tabs/OpenClawEmbed'
import CeoControls from './components/tabs/CeoControls'
import Search from './components/tabs/Search'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      gcTime: 5 * 60_000,
    },
  },
})

function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':       return <Overview />
      case 'agents':         return <Agents />
      case 'pipeline':       return <Pipeline />
      case 'standup':        return <Standup />
      case 'cron-jobs':      return <CronJobs />
      case 'tickets':        return <Tickets />
      case 'learnings':      return <Learnings />
      case 'skills':         return <Skills />
      case 'cost-estimator': return <CostEstimator />
      case 'smart-routing':  return <SmartRouting />
      case 'prompt-eng':     return <PromptEng />
      case 'caching':        return <Caching />
      case 'errors-logs':    return <ErrorsLogs />
      case 'openclaw-embed': return <OpenClawEmbed />
      case 'ceo-controls':   return <CeoControls />
      case 'search':         return <Search />
      default:               return <Overview />
    }
  }

  return (
    <div className="flex h-screen bg-[#0a0e1a] text-white overflow-hidden">
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 min-h-full">
          {renderTab()}
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#151932',
            color: '#fff',
            border: '1px solid #1e2645',
            fontSize: '13px',
          },
        }}
      />
    </QueryClientProvider>
  )
}
