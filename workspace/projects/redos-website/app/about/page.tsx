import type { Metadata } from 'next';
import { Zap, Target, GitBranch, Shield } from 'lucide-react';

export const metadata: Metadata = { title: 'About' };

const values = [
  { icon: Zap, color: '#6366f1', title: 'Autonomy First', desc: 'Every process should be automatable. If a human does it twice, an agent should do it forever.' },
  { icon: Target, color: '#22d3ee', title: 'Ship Fast', desc: '3 months to MVP, not 12. We bias toward working software over perfect planning.' },
  { icon: GitBranch, color: '#ec4899', title: 'Open Source Default', desc: 'Everything we build ships as open source. The community makes it better.' },
  { icon: Shield, color: '#22c55e', title: 'Safe Autonomy', desc: 'L0–L5 action gates, Telegram approvals, and INFOSEC review ensure we never break prod.' },
];

const timeline = [
  { date: 'Feb 2026', event: 'RedOS launched — 8 agents deployed, A2A protocol verified' },
  { date: 'Mar 2026', event: 'Event-driven architecture complete: 110→30 active crons, n8n integration' },
  { date: 'Mar 2026', event: 'GOAL-007 started: 10 open-source projects in 2 months' },
  { date: 'Mar 2026', event: 'Website agency pipeline: 1030 leads, 977 sites built' },
  { date: 'Apr 2026', event: '(Planned) First 5 projects shipped to GitHub' },
  { date: 'May 2026', event: '(Planned) 10 projects live, website agency at 5+ clients/month' },
];

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '4rem 1.5rem' }}>
      {/* Mission */}
      <section style={{ marginBottom: '5rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>About RedOS</h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1.8, marginBottom: '1.5rem' }}>
          RedOS is an AI-first development studio powered entirely by autonomous agents. We don't hire engineers — we build agents that do the engineering.
        </p>
        <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.8 }}>
          Our goal: prove that a team of 8 AI agents can run a real software business — building open-source tools, serving clients, and managing infrastructure — with minimal human intervention.
        </p>
      </section>

      {/* Values */}
      <section style={{ marginBottom: '5rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '2rem' }}>What We Believe</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.2rem' }}>
          {values.map(v => {
            const Icon = v.icon;
            return (
              <div key={v.title} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '1.5rem' }}>
                <div style={{ width: 40, height: 40, background: `${v.color}20`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <Icon size={18} color={v.color} />
                </div>
                <h3 style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: '0.5rem' }}>{v.title}</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.65 }}>{v.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Architecture */}
      <section style={{ marginBottom: '5rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '1.5rem' }}>How It Works</h2>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: '2rem', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.8 }}>
          <div style={{ color: '#6366f1', marginBottom: '0.5rem' }}># Bounded Autonomy Model (L0–L5)</div>
          <div>L0 read-only        → auto-approve</div>
          <div>L1 safe-write       → auto-approve</div>
          <div>L2 reversible-change → auto-approve</div>
          <div>L3 infra/sensitive  → INFOSEC A2A review (120s)</div>
          <div>L4 external/money   → Telegram approval (10 min)</div>
          <div>L5 critical         → Telegram approval (30 min)</div>
          <br />
          <div style={{ color: '#6366f1' }}># Request Flow</div>
          <div>User → OpenClaw Gateway → Agent Session → 9Router</div>
          <div>     → Response → LLM Analytics Plugin → logs/*.jsonl</div>
        </div>
      </section>

      {/* Timeline */}
      <section>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '2rem' }}>Timeline</h2>
        <div style={{ position: 'relative', paddingLeft: '2rem' }}>
          <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: '#334155' }} />
          {timeline.map((t, i) => (
            <div key={i} style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <div style={{ position: 'absolute', left: -28, top: 4, width: 10, height: 10, borderRadius: '50%', background: '#6366f1', border: '2px solid #0f172a' }} />
              <div style={{ color: '#6366f1', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>{t.date}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{t.event}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
