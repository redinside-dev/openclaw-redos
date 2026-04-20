import Link from 'next/link';
import { Github, ArrowRight, Zap, Shield, Code, BarChart3, Search, Settings, Brain, Terminal } from 'lucide-react';

const agents = [
  { id: 'RED',      role: 'CEO',                     color: '#ec4899', icon: Brain,    desc: 'Orchestration, approvals, strategic direction' },
  { id: 'ZEN',      role: 'CSO',                     color: '#22d3ee', icon: Search,   desc: 'General strategy, research coordination' },
  { id: 'ENG',      role: 'Software Engineer',        color: '#6366f1', icon: Code,     desc: 'Code, architecture, technical implementation' },
  { id: 'RESEARCH', role: 'Analyst',                  color: '#f59e0b', icon: Search,   desc: 'Market research, trend analysis, validation' },
  { id: 'FINANCE',  role: 'Finance Analyst',          color: '#22c55e', icon: BarChart3, desc: 'Cost tracking, budget guardrails, reporting' },
  { id: 'OPS',      role: 'DevOps Engineer',          color: '#8b5cf6', icon: Settings, desc: 'Infrastructure, monitoring, health checks' },
  { id: 'INFOSEC',  role: 'Security Engineer',        color: '#ef4444', icon: Shield,   desc: 'Security reviews, L3 approvals, compliance' },
  { id: 'HATAKE',   role: 'Intent Parser',            color: '#64748b', icon: Terminal, desc: 'Internal NLP, intent classification' },
];

const projects = [
  { slug: 'costwatch',          name: 'CostWatch',              desc: 'Real-time LLM cost tracking across providers.', stack: ['Node.js', 'Socket.IO', 'Chart.js'], color: '#6366f1' },
  { slug: 'a2a-protocol',       name: 'A2A Protocol',           desc: 'Standardized agent-to-agent communication layer.', stack: ['TypeScript', 'WebSockets'], color: '#22d3ee' },
  { slug: 'pr-auto-reviewer',   name: 'PR Auto Reviewer',       desc: 'AI-powered pull request review automation.', stack: ['Python', 'GitHub API', 'LLM'], color: '#ec4899' },
  { slug: 'llm-gateway-proxy',  name: 'LLM Gateway Proxy',      desc: 'Universal proxy with model fallback chains.', stack: ['Node.js', 'Express', 'SQLite'], color: '#f59e0b' },
  { slug: 'agent-eval-harness', name: 'Agent Eval Harness',     desc: 'Automated regression testing for LLM agents.', stack: ['Python', 'YAML', 'CLI'], color: '#22c55e' },
];

const stats = [
  { value: '8', label: 'Autonomous Agents' },
  { value: '115', label: 'Cron Jobs' },
  { value: '85%', label: 'Autonomy Score' },
  { value: '10', label: 'Open Source Projects' },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section style={{ minHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '6rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
        {/* Background gradient */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 30%, #6366f115 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, #22d3ee10 0%, transparent 50%)', pointerEvents: 'none' }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#6366f115', border: '1px solid #6366f130', borderRadius: 50, padding: '0.4rem 1rem', marginBottom: '1.5rem' }}>
          <Zap size={14} color="#6366f1" />
          <span style={{ color: '#6366f1', fontSize: '0.8rem', fontWeight: 600 }}>AI-First Development Studio</span>
        </div>

        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', maxWidth: 800 }}>
          <span className="gradient-text">AI-Powered Development</span>
          <br />at Scale
        </h1>

        <p style={{ color: '#94a3b8', fontSize: '1.15rem', lineHeight: 1.7, maxWidth: 560, marginBottom: '2.5rem' }}>
          RedOS delivers intelligent, scalable software solutions powered by 8 autonomous AI agents working 24/7 to build, ship, and maintain production systems.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#6366f1', color: 'white', padding: '0.8rem 1.8rem', borderRadius: 10, fontWeight: 600, textDecoration: 'none', fontSize: '0.95rem' }}>
            Explore Our Work <ArrowRight size={16} />
          </Link>
          <a href="https://github.com/anuragg-saxenaa" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#1e293b', color: '#f1f5f9', padding: '0.8rem 1.8rem', borderRadius: 10, fontWeight: 600, textDecoration: 'none', fontSize: '0.95rem', border: '1px solid #334155' }}>
            <Github size={16} /> View on GitHub
          </a>
        </div>
      </section>

      {/* Stats */}
      <section style={{ borderTop: '1px solid #334155', borderBottom: '1px solid #334155', padding: '2.5rem 1.5rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '2rem', textAlign: 'center' }}>
          {stats.map(s => (
            <div key={s.label}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#6366f1' }}>{s.value}</div>
              <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Projects */}
      <section style={{ padding: '5rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem' }}>Open Source Projects</h2>
            <p style={{ color: '#94a3b8' }}>Tools built by our agents to solve real developer pain points.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {projects.map(p => (
              <div key={p.slug} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: '1.5rem', transition: 'border-color .2s', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = p.color)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#334155')}>
                <div style={{ width: 40, height: 40, background: `${p.color}20`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <Code size={18} color={p.color} />
                </div>
                <h3 style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#f1f5f9' }}>{p.name}</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: 1.6 }}>{p.desc}</p>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {p.stack.map(t => (
                    <span key={t} style={{ background: '#0f172a', color: '#64748b', padding: '0.2rem 0.6rem', borderRadius: 50, fontSize: '0.72rem', fontWeight: 500 }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link href="/projects" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              View all projects <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* Team */}
      <section style={{ padding: '5rem 1.5rem', background: '#0a1020' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem' }}>The Team</h2>
            <p style={{ color: '#94a3b8' }}>8 specialized AI agents, each an expert in their domain.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {agents.map(a => {
              const Icon = a.icon;
              return (
                <div key={a.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ width: 42, height: 42, background: `${a.color}20`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color={a.color} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem' }}>{a.id}</div>
                    <div style={{ color: a.color, fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem' }}>{a.role}</div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.5 }}>{a.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link href="/team" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              Meet the team <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '5rem 1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>
            Built by AI. <span className="gradient-text">For developers.</span>
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: 1.7 }}>
            Every project is open source. Every agent is autonomous. Join us on GitHub.
          </p>
          <a href="https://github.com/anuragg-saxenaa" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#1e293b', color: '#f1f5f9', padding: '0.9rem 2rem', borderRadius: 10, fontWeight: 600, textDecoration: 'none', border: '1px solid #334155' }}>
            <Github size={18} /> View on GitHub
          </a>
        </div>
      </section>
    </>
  );
}
