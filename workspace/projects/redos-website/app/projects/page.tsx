import type { Metadata } from 'next';
import { Github, ExternalLink, Code } from 'lucide-react';

export const metadata: Metadata = { title: 'Projects' };

const projects = [
  {
    slug: 'costwatch', name: 'CostWatch', status: 'building',
    desc: 'Real-time LLM cost tracking and monitoring dashboard. Track costs across OpenAI, Anthropic, and Google with budget alerts and live analytics.',
    stack: ['Node.js', 'Express', 'Socket.IO', 'Chart.js'], color: '#6366f1',
    phase: 'Phase 1: Core Dashboard',
  },
  {
    slug: 'redos-website', name: 'RedOS Website', status: 'building',
    desc: 'This very website — the public face of RedOS. Built with Next.js 16, Tailwind CSS 4, and Framer Motion by our ENG agent.',
    stack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Framer Motion'], color: '#22d3ee',
    phase: 'Phase 1: Foundation',
  },
  {
    slug: 'a2a-protocol', name: 'A2A Protocol', status: 'ready',
    desc: 'Standardized agent-to-agent communication protocol. Retry logic, handoff schemas, and context propagation across agents.',
    stack: ['TypeScript', 'WebSockets', 'JSON Schema'], color: '#ec4899',
    phase: 'Spec complete',
  },
  {
    slug: 'pr-auto-reviewer', name: 'PR Auto Reviewer', status: 'ready',
    desc: 'AI-powered pull request review automation. Analyzes diffs, enforces coding standards, and posts structured feedback.',
    stack: ['Python', 'GitHub API', 'Claude API'], color: '#f59e0b',
    phase: 'Spec complete',
  },
  {
    slug: 'codebase-onboarding-agent', name: 'Codebase Onboarding Agent', status: 'shipped',
    desc: 'Automated codebase analysis and onboarding report generator. Analyzes structure, patterns, and entry points.',
    stack: ['Python', 'AST', 'CLI'], color: '#22c55e',
    phase: 'MVP shipped',
  },
  {
    slug: 'llm-gateway-proxy', name: 'LLM Gateway Proxy', status: 'ready',
    desc: 'Universal LLM proxy with fallback chains, unified OpenAI-compatible API, and built-in cost tracking.',
    stack: ['Node.js', 'Express', 'SQLite', 'YAML'], color: '#8b5cf6',
    phase: 'Spec complete',
  },
  {
    slug: 'agent-eval-harness', name: 'Agent Eval Harness', status: 'ready',
    desc: 'Automated evaluation framework for LLM agents. YAML test scenarios, semantic scoring, regression detection.',
    stack: ['Python', 'YAML', 'sentence-transformers'], color: '#06b6d4',
    phase: 'Spec complete',
  },
  {
    slug: 'context-window-optimizer', name: 'Context Window Optimizer', status: 'ready',
    desc: 'Automatically compresses conversation context to stay within token limits while preserving key facts.',
    stack: ['Python', 'tiktoken', 'pip package'], color: '#f97316',
    phase: 'Spec complete',
  },
  {
    slug: 'agent-loop-detection', name: 'Agent Loop Detection', status: 'ready',
    desc: 'Detects and breaks infinite loops in autonomous agent execution. Used internally in RedOS.',
    stack: ['Node.js', 'Pattern matching'], color: '#64748b',
    phase: 'Spec complete',
  },
  {
    slug: 'session-memory', name: 'Session Memory', status: 'ready',
    desc: 'Persistent cross-session memory for LLM agents. Stores and retrieves episodic context via vector similarity.',
    stack: ['Python', 'Qdrant', 'fastembed'], color: '#a855f7',
    phase: 'Spec complete',
  },
];

const statusColors: Record<string, string> = {
  shipped: '#22c55e',
  building: '#f59e0b',
  ready: '#6366f1',
};

export default function ProjectsPage() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '4rem 1.5rem' }}>
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Projects</h1>
        <p style={{ color: '#94a3b8', fontSize: '1.05rem' }}>
          10 open-source projects built by autonomous agents. MIT licensed. Built with love by robots.
        </p>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        {[['shipped', '✅ Shipped'], ['building', '🔨 Building'], ['ready', '📋 Spec Ready']].map(([s, l]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColors[s] }} />
            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{l}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {projects.map(p => (
          <div key={p.slug}
            style={{ background: '#1e293b', border: `1px solid #334155`, borderRadius: 14, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = p.color)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#334155')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 42, height: 42, background: `${p.color}20`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Code size={18} color={p.color} />
              </div>
              <span style={{ background: `${statusColors[p.status]}20`, color: statusColors[p.status], padding: '0.2rem 0.6rem', borderRadius: 50, fontSize: '0.72rem', fontWeight: 600 }}>
                {p.phase}
              </span>
            </div>

            <div>
              <h2 style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '0.4rem' }}>{p.name}</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.65 }}>{p.desc}</p>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {p.stack.map(t => (
                <span key={t} style={{ background: '#0f172a', color: '#64748b', padding: '0.2rem 0.6rem', borderRadius: 50, fontSize: '0.72rem', fontWeight: 500 }}>{t}</span>
              ))}
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', gap: '0.75rem' }}>
              <a href={`https://github.com/anuragg-saxenaa/${p.slug}`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', textDecoration: 'none', fontSize: '0.8rem' }}>
                <Github size={13} /> GitHub
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
