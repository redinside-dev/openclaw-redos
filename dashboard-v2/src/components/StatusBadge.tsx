type StatusType = 'online' | 'idle' | 'offline' | 'success' | 'failed' | 'running' | 'pending' |
  'open' | 'in-progress' | 'resolved' | 'closed' | 'critical' | 'high' | 'medium' | 'low' |
  'enabled' | 'disabled' | string

interface StatusBadgeProps {
  status: StatusType
  showDot?: boolean
  className?: string
}

const statusConfig: Record<string, { color: string; dot: string; label?: string }> = {
  online:     { color: 'text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/30', dot: 'bg-[#00ff88]' },
  idle:       { color: 'text-[#ffaa00] bg-[#ffaa00]/10 border border-[#ffaa00]/30', dot: 'bg-[#ffaa00]' },
  offline:    { color: 'text-gray-400 bg-gray-400/10 border border-gray-400/30', dot: 'bg-gray-400' },
  success:    { color: 'text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/30', dot: 'bg-[#00ff88]' },
  failed:     { color: 'text-[#ff3366] bg-[#ff3366]/10 border border-[#ff3366]/30', dot: 'bg-[#ff3366]' },
  running:    { color: 'text-[#00d4ff] bg-[#00d4ff]/10 border border-[#00d4ff]/30', dot: 'bg-[#00d4ff]' },
  pending:    { color: 'text-[#ffaa00] bg-[#ffaa00]/10 border border-[#ffaa00]/30', dot: 'bg-[#ffaa00]' },
  open:       { color: 'text-[#00d4ff] bg-[#00d4ff]/10 border border-[#00d4ff]/30', dot: 'bg-[#00d4ff]' },
  'in-progress': { color: 'text-[#ffaa00] bg-[#ffaa00]/10 border border-[#ffaa00]/30', dot: 'bg-[#ffaa00]' },
  resolved:   { color: 'text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/30', dot: 'bg-[#00ff88]' },
  closed:     { color: 'text-gray-400 bg-gray-400/10 border border-gray-400/30', dot: 'bg-gray-400' },
  critical:   { color: 'text-[#ff3366] bg-[#ff3366]/10 border border-[#ff3366]/30', dot: 'bg-[#ff3366]' },
  high:       { color: 'text-[#ff6b35] bg-[#ff6b35]/10 border border-[#ff6b35]/30', dot: 'bg-[#ff6b35]' },
  medium:     { color: 'text-[#ffaa00] bg-[#ffaa00]/10 border border-[#ffaa00]/30', dot: 'bg-[#ffaa00]' },
  low:        { color: 'text-gray-300 bg-gray-300/10 border border-gray-300/30', dot: 'bg-gray-300' },
  enabled:    { color: 'text-[#00ff88] bg-[#00ff88]/10 border border-[#00ff88]/30', dot: 'bg-[#00ff88]' },
  disabled:   { color: 'text-gray-400 bg-gray-400/10 border border-gray-400/30', dot: 'bg-gray-400' },
}

export default function StatusBadge({ status, showDot = true, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status?.toLowerCase()] ?? {
    color: 'text-gray-400 bg-gray-400/10 border border-gray-400/30',
    dot: 'bg-gray-400',
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${config.color} ${className}`}>
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot} status-pulse flex-shrink-0`} />
      )}
      {status}
    </span>
  )
}
