import Link from 'next/link';
import AppShell from '@/components/AppShell';

export default function HelpPage() {
  return (
    <AppShell>
      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow amber">LEGAL LENS · TRUST &amp; ARCHITECTURE</p>
            <h1>Help Center &amp; Methodology</h1>
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
          <p className="eyebrow amber">SYSTEM TRANSPARENCY</p>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '26px', margin: '8px 0 12px', color: 'var(--ink)' }}>
            How Legal Lens Analyzes Agreements
          </h2>
          <p style={{ color: 'var(--ink-mid)', fontSize: '13px', lineHeight: '1.6' }}>
            Legal Lens uses deterministic clause pattern matching and document grounding to extract
            commercial terms, risk flags, and contractual obligations. Every generated insight links
            directly back to a verifiable clause and quoted excerpt within your agreement.
          </p>

          <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            <div style={{ background: 'var(--panel-raised)', padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
              <h4 style={{ fontSize: '13px', margin: '0 0 6px', color: 'var(--ink)', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                01 Verbatim Document Text
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--ink-mid)', lineHeight: '1.5', margin: 0 }}>
                Direct quotations appear in quotation marks and cite exact section headers. We never
                fabricate clause references or modify contractual language.
              </p>
            </div>
            <div style={{ background: 'var(--panel-raised)', padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
              <h4 style={{ fontSize: '13px', margin: '0 0 6px', color: 'var(--ink)', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                02 Plain-Language Synthesis
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--ink-mid)', lineHeight: '1.5', margin: 0 }}>
                Explanations highlight practical business impacts, such as notice buffers, liability
                carve-outs, and auto-renewal traps, to help you prepare for negotiations.
              </p>
            </div>
            <div style={{ background: 'var(--panel-raised)', padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
              <h4 style={{ fontSize: '13px', margin: '0 0 6px', color: 'var(--ink)', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                03 Honest Not-Found Handling
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--ink-mid)', lineHeight: '1.5', margin: 0 }}>
                When a question addresses provisions not present in your document, Legal Lens clearly
                states that the topic was not found rather than hallucinating terms.
              </p>
            </div>
            <div style={{ background: 'var(--panel-raised)', padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
              <h4 style={{ fontSize: '13px', margin: '0 0 6px', color: 'var(--ink)', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                04 Private by Design
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--ink-mid)', lineHeight: '1.5', margin: 0 }}>
                In this local deployment, documents and analyses are persisted only in your local
                workspace environment. No document text is sent to third-party public models.
              </p>
            </div>
          </div>
        </section>

        <section
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
            padding: '24px 28px',
          }}
        >
          <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '22px', margin: '0 0 8px', color: 'var(--ink)' }}>
            Legal Disclaimer &amp; Boundary
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--ink-dim)', lineHeight: '1.6', margin: 0, fontFamily: "'Space Mono', monospace" }}>
            Legal Lens is designed for informational comprehension and decision support only. It does
            not provide legal advice, representation, or formal opinions on enforceability under specific
            statutory regimes. For binding agreements, regulatory compliance, or contentious disputes,
            always consult a licensed attorney in your jurisdiction.
          </p>
        </section>
      </main>
    </AppShell>
  );
}
