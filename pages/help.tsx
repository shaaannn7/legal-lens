import Link from 'next/link';
import AppShell from '@/components/AppShell';

export default function HelpPage() {
  const problemStatementUseCases = [
    {
      title: 'Simplifying Complex Legal Documents',
      solution: 'Converts dense legalese into 2-3 sentence plain-English summaries, plain language risk notes, and clear executive briefs.',
      icon: '📄',
    },
    {
      title: 'Comparing Contracts & Policies',
      solution: 'Section-by-section redline comparison matching clauses between drafts, highlighting added, removed, and modified provisions with risk severity tags.',
      icon: '⟷',
    },
    {
      title: 'Highlighting Important Clauses & Risks',
      solution: '10+ clause taxonomies with a 0-100 risk scorecard, critical/moderate/low risk flags, obligation trackers, and missing protection alerts.',
      icon: '⚠️',
    },
    {
      title: 'Answering Grounded Questions',
      solution: 'Google Gemini AI assistant answers complex queries grounded directly in document text with exact section citations and line numbers.',
      icon: '💬',
    },
    {
      title: 'Options & Potential Next Steps',
      solution: 'Generates dynamic negotiation levers with prioritized strategies and exact counter-proposal suggested language.',
      icon: '🎯',
    },
    {
      title: 'Generating Summaries & Actionable Checklists',
      solution: 'One-click export of Executive Summaries (Markdown), Negotiation Levers (Markdown), and Redline Comparison reports (CSV).',
      icon: '📋',
    },
    {
      title: 'Preparing Questions for Legal Counsel',
      solution: 'Automatically generates tailored legal counsel questions based on the specific contract risks identified during analysis.',
      icon: '⚖️',
    },
  ];

  return (
    <AppShell>
      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow amber">LEGAL LENS · PROBLEM STATEMENT ALIGNMENT</p>
            <h1>AI for Legal Assistance &amp; Access</h1>
          </div>
          <div className="topbar-actions">
            <Link href="/" className="outline-btn" style={{ textDecoration: 'none' }}>
              ← Workspace
            </Link>
          </div>
        </header>

        <section
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
            padding: '28px',
            marginBottom: '20px',
          }}
        >
          <p className="eyebrow amber">GENAI WORKSTATION METHODOLOGY</p>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '26px', margin: '8px 0 12px', color: 'var(--ink)' }}>
            How Legal Lens Fulfills the Legal Assistance Problem Statement
          </h2>
          <p style={{ color: 'var(--ink-mid)', fontSize: '13px', lineHeight: '1.6' }}>
            Legal Lens makes legal information accessible by combining <strong>Google Gemini 1.5 Flash GenAI</strong> with a grounded deterministic verification engine. It translates legalese into actionable decision support while maintaining a clear disclaimer that it assists rather than replaces professional legal counsel.
          </p>

          <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {problemStatementUseCases.map((uc, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--panel-raised)',
                  padding: '20px',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{uc.icon}</span>
                  <h4 style={{ fontSize: '14px', margin: 0, color: 'var(--ink)', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                    {uc.title}
                  </h4>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--ink-mid)', lineHeight: '1.5', margin: 0 }}>
                  {uc.solution}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
