import React, { useState } from 'react'
import { ExternalLink, RefreshCw, Maximize2 } from 'lucide-react'

const DASHBOARD_URL = 'http://localhost:19000'

export default function OpenClawEmbed() {
  const [fullscreen, setFullscreen] = useState(false)
  const [key, setKey] = useState(0)

  const iframeStyle: React.CSSProperties = fullscreen
    ? {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        width: '100vw', height: '100vh',
        zIndex: 100,
        border: 'none',
        background: '#0a0e1a',
      }
    : {
        width: '100%',
        height: '75vh',
        minHeight: 600,
        border: 'none',
        borderRadius: '0.75rem',
        background: '#0a0e1a',
      }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">OpenClaw Native UI</h1>
          <p className="text-xs text-gray-400 mt-0.5">Embedded gateway dashboard at port 19000</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setKey(k => k + 1)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 border border-[#1e2645] rounded-lg hover:border-[#2a3558] transition-colors"
          >
            <RefreshCw size={12} />
            Reload
          </button>
          <button
            onClick={() => setFullscreen(f => !f)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 border border-[#1e2645] rounded-lg hover:border-[#2a3558] transition-colors"
          >
            <Maximize2 size={12} />
            {fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <a
            href={DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[#00d4ff] px-3 py-1.5 border border-[#00d4ff]/30 rounded-lg hover:bg-[#00d4ff]/10 transition-colors"
          >
            <ExternalLink size={12} />
            Open in Tab
          </a>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: 'Pipeline', path: '/api/pipeline' },
          { label: 'Analytics', path: '/api/analytics' },
          { label: 'Agents', path: '/api/agents' },
          { label: 'Dashboard', path: '/api/dashboard' },
          { label: 'Health', path: '/api/health' },
        ].map(link => (
          <a
            key={link.path}
            href={`${DASHBOARD_URL}${link.path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] px-2.5 py-1 rounded-md text-gray-400 border border-[#1e2645] hover:text-[#00d4ff] hover:border-[#00d4ff]/40 transition-colors font-mono"
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Iframe */}
      <div className="relative">
        {fullscreen && (
          <button
            onClick={() => setFullscreen(false)}
            className="fixed top-4 right-4 z-[101] bg-[#151932] border border-[#1e2645] text-white px-3 py-1.5 rounded-lg text-xs hover:bg-[#1e2645] transition-colors"
          >
            Exit Fullscreen (ESC)
          </button>
        )}
        <iframe
          key={key}
          src={DASHBOARD_URL}
          style={iframeStyle}
          title="OpenClaw Dashboard"
          sandbox="allow-same-origin allow-scripts allow-forms"
          loading="lazy"
        />
      </div>

      {/* Fallback info */}
      <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-4 text-xs text-gray-500">
        <p>
          The OpenClaw native dashboard runs at{' '}
          <code className="text-[#00d4ff] font-mono">{DASHBOARD_URL}</code>.
          Basic auth: <code className="text-[#00d4ff] font-mono">red / redos2026</code>.
          If the iframe shows a blank page, use the "Open in Tab" button or ensure the gateway service is running.
        </p>
        <p className="mt-1">
          Start: <code className="text-[#00ff88] font-mono">bash ~/.openclaw/scripts/redos-restart.sh</code>
        </p>
      </div>
    </div>
  )
}
