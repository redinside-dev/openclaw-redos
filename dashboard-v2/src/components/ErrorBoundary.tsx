import React from 'react'

interface State { error: Error | null }

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: string },
  State
> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6 rounded-xl bg-[#ff3366]/10 border border-[#ff3366]/30">
          <h2 className="text-[#ff3366] font-bold mb-2">
            {this.props.fallback ?? 'Component Error'}
          </h2>
          <pre className="text-xs text-gray-400 overflow-auto whitespace-pre-wrap">
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
