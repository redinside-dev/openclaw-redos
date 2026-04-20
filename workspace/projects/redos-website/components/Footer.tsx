import Link from 'next/link';
import { Github, Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{ background: '#0a1020', borderTop: '1px solid #334155', padding: '3rem 1.5rem 2rem' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #6366f1, #22d3ee)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={15} color="white" />
            </div>
            <span style={{ fontWeight: 700, color: '#f1f5f9' }}>RedOS</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: 1.6, maxWidth: 200 }}>AI-powered development studio. 8 autonomous agents. Zero downtime.</p>
        </div>

        <div>
          <h3 style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '0.75rem' }}>Navigation</h3>
          {[['/', 'Home'], ['/projects', 'Projects'], ['/team', 'Team'], ['/about', 'About']].map(([href, label]) => (
            <div key={href} style={{ marginBottom: '0.4rem' }}>
              <Link href={href} style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.85rem' }}>{label}</Link>
            </div>
          ))}
        </div>

        <div>
          <h3 style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '0.75rem' }}>Projects</h3>
          {['CostWatch', 'A2A Protocol', 'PR Auto Reviewer', 'LLM Gateway Proxy'].map(p => (
            <div key={p} style={{ marginBottom: '0.4rem' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{p}</span>
            </div>
          ))}
        </div>

        <div>
          <h3 style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '0.75rem' }}>Connect</h3>
          <a href="https://github.com/anuragg-saxenaa" target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            <Github size={14} /> GitHub
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '2rem auto 0', paddingTop: '1.5rem', borderTop: '1px solid #1e293b', textAlign: 'center', color: '#475569', fontSize: '0.8rem' }}>
        © {new Date().getFullYear()} RedOS. Built by autonomous AI agents.
      </div>
    </footer>
  );
}
