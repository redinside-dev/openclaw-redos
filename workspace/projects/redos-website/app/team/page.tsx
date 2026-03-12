import type { Metadata } from 'next';
import { Brain, Search, Code, BarChart3, Shield, Settings, Terminal, Zap } from 'lucide-react';

export const metadata: Metadata = { title: 'Team' };

const agents = [
  {
    id: 'RED', name: 'RED', title: 'CEO — Chief Executive Officer',
    color: '#ec4899', icon: Brain,
    bio: 'The orchestrator. RED manages the entire RedOS operation — approving L4/L5 actions via Telegram, reviewing daily progress, and keeping all 7 other agents aligned with company goals.',
    capabilities: ['Strategic oversight', 'L4/L5 Telegram approvals', 'Cross-agent coordination', 'Goal setting & tracking'],
    model: '9router/free-unlimited',
    channel: '@RedinsideBot',
  },
  {
    id: 'ZEN', name: 'ZEN', title: 'CSO — Chief Strategy Officer',
    color: '#22d3ee', icon: Zap,
    bio: 'The generalist. ZEN handles anything that doesn\'t fit a specialist box — outreach, client communication, strategy, and serving as the public-facing voice of RedOS.',
    capabilities: ['Client outreach', 'General strategy', 'Content creation', 'Team coordination'],
    model: '9router/free-unlimited',
    channel: '@ZenRedBot',
  },
  {
    id: 'ENG', name: 'ENG', title: 'Software Engineer',
    color: '#6366f1', icon: Code,
    bio: 'The builder. ENG implements all software from SPEC.md files, creates GitHub repos, opens PRs, and ships working code. Currently building 10 open-source projects.',
    capabilities: ['Full-stack development', 'GitHub repo management', 'PR creation', 'Architecture design'],
    model: '9router/free-unlimited',
    channel: '@ENG_BOT',
  },
  {
    id: 'RESEARCH', name: 'RESEARCH', title: 'Research Analyst',
    color: '#f59e0b', icon: Search,
    bio: 'The analyst. RESEARCH mines developer pain points, validates project ideas, analyzes market trends, and writes SPECs. Every project starts with RESEARCH\'s validation.',
    capabilities: ['Pain point mining', 'Market analysis', 'SPEC writing', 'Trend research'],
    model: '9router/free-unlimited',
    channel: '@RESEARCH_BOT',
  },
  {
    id: 'FINANCE', name: 'FINANCE', title: 'Finance Analyst',
    color: '#22c55e', icon: BarChart3,
    bio: 'The watchdog. FINANCE monitors all API costs, enforces budget guardrails, runs weekly cost reports, and flags any PAYG spend before it spirals.',
    capabilities: ['Cost monitoring', 'Budget enforcement', 'Weekly cost reports', 'Subscription audits'],
    model: '9router/free-unlimited',
    channel: '@FINANCE_BOT',
  },
  {
    id: 'OPS', name: 'OPS', title: 'DevOps Engineer',
    color: '#8b5cf6', icon: Settings,
    bio: 'The janitor and guardian. OPS runs health checks, manages cron jobs, resolves stale tasks, upgrades services, and keeps the 4-layer gateway resilience system alive.',
    capabilities: ['Health monitoring', 'Cron management', 'Service recovery', 'Infrastructure ops'],
    model: '9router/free-unlimited',
    channel: '@OPSRED_BOT',
  },
  {
    id: 'INFOSEC', name: 'INFOSEC', title: 'Security Engineer',
    color: '#ef4444', icon: Shield,
    bio: 'The gatekeeper. INFOSEC reviews all L3 security-sensitive actions before execution, runs credential health checks, and ensures no secrets land in committed code.',
    capabilities: ['L3 security reviews', 'Credential monitoring', 'Access control', 'Security audits'],
    model: '9router/free-unlimited',
    channel: '@INFOSECRED_BOT',
  },
  {
    id: 'HATAKE', name: 'HATAKE', title: 'Internal Intent Parser',
    color: '#64748b', icon: Terminal,
    bio: 'The brain behind the brain. HATAKE classifies intent, routes messages to the right agent, and runs the website agency lead-gen pipeline. Internal-only — no public Telegram.',
    capabilities: ['Intent classification', 'Message routing', 'Lead generation', 'NLP processing'],
    model: '9router/free-unlimited',
    channel: 'Internal only',
  },
];

export default function TeamPage() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '4rem 1.5rem' }}>
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>The Team</h1>
        <p style={{ color: '#94a3b8', fontSize: '1.05rem', maxWidth: 600 }}>
          8 specialized AI agents, each with a distinct domain, identity, and set of capabilities. They collaborate 24/7 on a shared mission.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {agents.map(a => {
          const Icon = a.icon;
          return (
            <div key={a.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: 50, height: 50, background: `${a.color}20`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={22} color={a.color} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f1f5f9' }}>{a.name}</div>
                  <div style={{ color: a.color, fontSize: '0.78rem', fontWeight: 600 }}>{a.title}</div>
                </div>
              </div>

              <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.65 }}>{a.bio}</p>

              <div>
                <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '0.5rem' }}>Capabilities</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {a.capabilities.map(c => (
                    <span key={c} style={{ background: `${a.color}15`, color: a.color, padding: '0.2rem 0.6rem', borderRadius: 50, fontSize: '0.72rem', fontWeight: 500 }}>{c}</span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid #334155', fontSize: '0.75rem', color: '#475569' }}>
                <span>Model: <span style={{ color: '#64748b' }}>{a.model}</span></span>
                <span style={{ color: a.color }}>{a.channel}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
