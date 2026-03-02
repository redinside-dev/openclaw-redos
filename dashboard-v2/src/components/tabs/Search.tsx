import React, { useState, useCallback } from 'react'
import { Search as SearchIcon, Loader2, FileText, Zap } from 'lucide-react'
import { useSearch } from '../../api'

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = pct >= 80 ? '#00ff88' : pct >= 60 ? '#ffaa00' : '#6b7280'
  return (
    <div className="flex items-center gap-1">
      <div className="w-12 h-1 bg-[#1e2645] rounded-full overflow-hidden">
        <div className="h-1 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[9px] font-mono" style={{ color }}>{pct}%</span>
    </div>
  )
}

function formatTs(ts: string | undefined): string {
  if (!ts) return ''
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function Search() {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')

  const results = useSearch(submitted)

  const handleSearch = useCallback(() => {
    const q = query.trim()
    if (!q) return
    setSubmitted(q)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const resultList = results.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Search</h1>
          <p className="text-xs text-gray-400 mt-0.5">Semantic search over workspace logs and memory</p>
        </div>
      </div>

      {/* Search box */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              className="w-full bg-[#151932] border border-[#1e2645] text-white text-sm rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-[#00d4ff] placeholder:text-gray-600 transition-colors"
              placeholder="Search agents, logs, memory, skills, tickets…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!query.trim() || results.isLoading}
            className="px-5 py-3 bg-[#00d4ff]/10 border border-[#00d4ff]/40 text-[#00d4ff] text-sm font-medium rounded-xl hover:bg-[#00d4ff]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {results.isLoading ? <Loader2 size={15} className="animate-spin" /> : <SearchIcon size={15} />}
            Search
          </button>
        </div>

        {/* Quick search suggestions */}
        {!submitted && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {[
              'budget guardrails', 'cron jobs', 'INFOSEC approval', 'ticket tracker',
              'ollama hatake', 'routing strategy', 'SOUL.md', 'memory core',
            ].map(suggestion => (
              <button
                key={suggestion}
                onClick={() => { setQuery(suggestion); setSubmitted(suggestion) }}
                className="text-[10px] px-2.5 py-1 rounded-md text-gray-500 border border-[#1e2645] hover:text-[#00d4ff] hover:border-[#00d4ff]/30 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {submitted && (
        <div>
          {results.isLoading ? (
            <div className="flex items-center gap-3 text-gray-500 text-sm py-8">
              <Loader2 size={18} className="animate-spin text-[#00d4ff]" />
              Searching "{submitted}"…
            </div>
          ) : results.error ? (
            <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-6 text-center">
              <div className="text-[#ffaa00] text-sm mb-1">Search unavailable</div>
              <div className="text-gray-500 text-xs">The /api/search endpoint may not be active</div>
            </div>
          ) : resultList.length === 0 ? (
            <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-8 text-center">
              <SearchIcon size={32} className="mx-auto mb-3 text-gray-700" />
              <div className="text-gray-400 text-sm">No results for "{submitted}"</div>
              <div className="text-gray-600 text-xs mt-1">Try different keywords or check the workspace is indexed</div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-gray-500">
                {resultList.length} result{resultList.length !== 1 ? 's' : ''} for "
                <span className="text-[#00d4ff]">{submitted}</span>"
              </div>
              {resultList.map((result, i) => (
                <div key={result.id ?? i}
                  className="bg-[#151932] border border-[#1e2645] rounded-xl p-4 hover:border-[#2a3558] transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-[#00d4ff]/10 flex items-center justify-center flex-shrink-0">
                        {result.type === 'skill' ? <Zap size={11} className="text-[#00d4ff]" /> : <FileText size={11} className="text-[#00d4ff]" />}
                      </div>
                      <span className="text-sm font-medium text-white">
                        {result.title ?? result.text?.slice(0, 60) ?? '—'}
                      </span>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      {result.type && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1e2645] text-gray-500 uppercase">
                          {result.type}
                        </span>
                      )}
                      {result.score != null && <ScoreBadge score={result.score} />}
                    </div>
                  </div>

                  {result.snippet && (
                    <p className="text-xs text-gray-400 leading-relaxed mb-2">
                      {result.snippet}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[10px] text-gray-600">
                    {result.agent && (
                      <span className="text-[#00d4ff]">{result.agent}</span>
                    )}
                    {result.timestamp && (
                      <span>{formatTs(result.timestamp)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!submitted && (
        <div className="bg-[#151932] border border-[#1e2645] rounded-xl p-10 text-center">
          <SearchIcon size={40} className="mx-auto mb-4 text-gray-700" />
          <h3 className="text-sm font-medium text-gray-400 mb-1">Semantic Search</h3>
          <p className="text-xs text-gray-600 max-w-xs mx-auto">
            Search across agent logs, memory, skills, tickets, and workspace files.
            Press Enter or click Search.
          </p>
        </div>
      )}
    </div>
  )
}
