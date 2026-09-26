import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { DocumentMeta, ComparisonResult, DifferenceType, SeverityLevel } from '@/types';
import { buildComparisonCsv } from '@/services/exports';

export default function ComparePage() {
  const router = useRouter();
  const { base, target } = router.query;

  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [baseDocId, setBaseDocId] = useState<string>('');
  const [compareDocId, setCompareDocId] = useState<string>('');
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    async function loadDocs() {
      try {
        const res = await fetch('/api/documents');
        if (res.ok) {
          const data = await res.json();
          const docList: DocumentMeta[] = (data.documents || []).map(
            (d: { document: DocumentMeta }) => d.document,
          );
          setDocs(docList);

          const initialBase =
            typeof base === 'string' && docList.some((d) => d.id === base)
              ? base
              : docList[0]?.id || '';

          const initialTarget =
            typeof target === 'string' && docList.some((d) => d.id === target)
              ? target
              : docList.find((d) => d.id !== initialBase)?.id || docList[0]?.id || '';

          setBaseDocId(initialBase);
          setCompareDocId(initialTarget);

          if (initialBase && initialTarget) {
            runComparison(initialBase, initialTarget);
          }
        }
      } catch {
        setError('Failed to load documents for comparison.');
      }
    }
    loadDocs();
  }, [base, target]);

  async function runComparison(bId = baseDocId, cId = compareDocId) {
    if (!bId || !cId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseDocId: bId, compareDocId: cId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Comparison calculation failed.');
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Comparison failed.');
    } finally {
      setLoading(false);
    }
  }

  function downloadComparisonReport() {
    if (!result) return;
    const lines = [
      `# Legal Lens Contract Comparison Report`,
      `**Baseline Document:** ${result.baseDocName}`,
      `**Revised Document:** ${result.compareDocName}`,
      `**Date:** ${new Date(result.comparedAt).toLocaleString()}`,
      ``,
      `## Executive Summary`,
      result.summary,
      ``,
      `## Detailed Clause Differences`,
      ...result.differences.map(
        (d, idx) =>
          `### ${idx + 1}. [${d.type.toUpperCase()}] ${d.title}\n` +
          `- **Section:** ${d.section}\n` +
          `- **Risk Severity:** ${d.severity.toUpperCase()}\n` +
          `- **Analysis:** ${d.description}\n` +
          (d.baseText ? `- **Baseline Text:** "${d.baseText}"\n` : '') +
          (d.compareText ? `- **Revised Text:** "${d.compareText}"\n` : ''),
      ),
      ``,
      `---`,
      `*Disclaimer: ${result.disclaimer}*`,
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Comparison_${result.baseDocName.replace(/\.[^.]+$/, '')}_vs_${result.compareDocName.replace(/\.[^.]+$/, '')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadComparisonCsv() {
    if (!result) return;
    const blob = new Blob([buildComparisonCsv(result)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Comparison_${result.baseDocName.replace(/\.[^.]+$/, '')}_vs_${result.compareDocName.replace(/\.[^.]+$/, '')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const [filterImpact, setFilterImpact] = useState<string>('all');
  const [redlineMode, setRedlineMode] = useState<'side' | 'inline'>('side');

  const differences = result?.differences || [];
  const filteredDiffs = differences.filter((d) => {
    const matchesType = filterType === 'all' || d.type === filterType;
    const matchesImpact = filterImpact === 'all' || (d.impact || 'neutral') === filterImpact;
    return matchesType && matchesImpact;
  });

  const addedCount = differences.filter((d) => d.type === 'added').length;
  const removedCount = differences.filter((d) => d.type === 'removed').length;
  const modifiedCount = differences.filter(
    (d) => d.type === 'modified' || d.type === 'obligation_changed',
  ).length;

  return (
    <AppShell>
      <main id="main-content" tabIndex={-1} className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">LEGAL LENS · REDLINE & REVISION COMPARISON</p>
            <h1>Contract Comparison</h1>
          </div>
          <div className="topbar-actions">
            {result && (
              <>
                <button className="outline-btn" onClick={downloadComparisonCsv}>
                  ↓ CSV
                </button>
                <button className="primary" onClick={downloadComparisonReport}>
                  ↓ Export .md
                </button>
                <button className="outline-btn" onClick={() => window.print()}>
                  Print / PDF
                </button>
              </>
            )}
            <Link href="/" className="outline-btn" style={{ textDecoration: 'none' }}>
              ← Workspace
            </Link>
          </div>
        </header>

        {/* Document Selector Grid */}
        <div
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
            padding: '24px 28px',
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr auto',
            gap: '16px',
            alignItems: 'end',
            marginBottom: '24px',
          }}
        >
          <div>
            <label style={{ display: 'block', fontFamily: "'Space Mono', monospace", fontSize: '9px', letterSpacing: '0.12em', color: 'var(--ink-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Baseline Agreement
            </label>
            <select
              value={baseDocId}
              onChange={(e) => { setBaseDocId(e.target.value); runComparison(e.target.value, compareDocId); }}
              style={{ width: '100%' }}
            >
              {docs.map((d) => (<option key={d.id} value={d.id}>{d.filename}</option>))}
            </select>
          </div>

          <span style={{ fontSize: '20px', color: 'var(--ink-dim)', fontWeight: 300, paddingBottom: '2px' }}>⟷</span>

          <div>
            <label style={{ display: 'block', fontFamily: "'Space Mono', monospace", fontSize: '9px', letterSpacing: '0.12em', color: 'var(--ink-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Revised Draft
            </label>
            <select
              value={compareDocId}
              onChange={(e) => { setCompareDocId(e.target.value); runComparison(baseDocId, e.target.value); }}
              style={{ width: '100%' }}
            >
              {docs.map((d) => (<option key={d.id} value={d.id}>{d.filename}</option>))}
            </select>
          </div>

          <button
            className="primary"
            onClick={() => runComparison()}
            disabled={loading || baseDocId === compareDocId}
          >
            {loading ? 'Scanning…' : 'Compare Now'}
          </button>
        </div>

        {error && (
          <div className="upload-notice" style={{ marginBottom: '20px' }}>
            <span>{error}</span>
            <button onClick={() => setError('')}>Dismiss</button>
          </div>
        )}

        {baseDocId === compareDocId && (
          <div style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: '20px', fontSize: '12px', color: 'var(--amber)', fontFamily: "'Space Mono', monospace" }}>
            Select two different documents to perform a comparative diff.
          </div>
        )}

        {/* Results View */}
        {result && (
          <>
            {/* Risk Score Trend & Comparison Metrics */}
            {result.scoreComparison && (
              <div
                style={{
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-lg)',
                  padding: '18px 22px',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px',
                }}
              >
                <div>
                  <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-dim)', fontFamily: "'Space Mono', monospace", display: 'block', marginBottom: '4px' }}>
                    COMPARATIVE RISK TRAJECTORY
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
                      {result.scoreComparison.riskTrend === 'improved'
                        ? '🟢 Risk Profile Improved in Revision'
                        : result.scoreComparison.riskTrend === 'worsened'
                        ? '🔴 Revision Increases Liability Risk'
                        : '🟡 Risk Profile Stays Comparable'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center', background: 'var(--canvas)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 14px' }}>
                    <span style={{ fontSize: '8px', color: 'var(--ink-dim)', display: 'block', fontFamily: "'Space Mono', monospace" }}>BASELINE SCORE</span>
                    <strong style={{ fontSize: '15px', color: 'var(--ink)' }}>{result.scoreComparison.baseScore}/100</strong>
                  </div>
                  <span style={{ color: 'var(--ink-dim)', fontSize: '16px' }}>➔</span>
                  <div style={{ textAlign: 'center', background: 'var(--canvas)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 14px' }}>
                    <span style={{ fontSize: '8px', color: 'var(--ink-dim)', display: 'block', fontFamily: "'Space Mono', monospace" }}>REVISION SCORE</span>
                    <strong
                      style={{
                        fontSize: '15px',
                        color:
                          result.scoreComparison.compareScore < result.scoreComparison.baseScore
                            ? 'var(--sage)'
                            : result.scoreComparison.compareScore > result.scoreComparison.baseScore
                            ? 'var(--rose)'
                            : 'var(--amber)',
                      }}
                    >
                      {result.scoreComparison.compareScore}/100
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Stats & Filter Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px', fontFamily: "'Space Mono', monospace", color: 'var(--ink-dim)' }}>TYPE:</span>
                <button className={`doc-pill ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>All ({differences.length})</button>
                <button className={`doc-pill ${filterType === 'added' ? 'active' : ''}`} onClick={() => setFilterType('added')}>Added ({addedCount})</button>
                <button className={`doc-pill ${filterType === 'modified' ? 'active' : ''}`} onClick={() => setFilterType('modified')}>Modified ({modifiedCount})</button>
                <button className={`doc-pill ${filterType === 'removed' ? 'active' : ''}`} onClick={() => setFilterType('removed')}>Removed ({removedCount})</button>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px', fontFamily: "'Space Mono', monospace", color: 'var(--ink-dim)' }}>IMPACT:</span>
                <button className={`doc-pill ${filterImpact === 'all' ? 'active' : ''}`} onClick={() => setFilterImpact('all')}>All</button>
                <button className={`doc-pill ${filterImpact === 'favorable' ? 'active' : ''}`} onClick={() => setFilterImpact('favorable')}>✓ Favorable</button>
                <button className={`doc-pill ${filterImpact === 'unfavorable' ? 'active' : ''}`} onClick={() => setFilterImpact('unfavorable')}>▲ Unfavorable</button>
                <button className={`doc-pill ${filterImpact === 'neutral' ? 'active' : ''}`} onClick={() => setFilterImpact('neutral')}>Neutral</button>

                <div className="view-mode-toggle" style={{ marginLeft: '8px' }}>
                  <button className={`view-mode-btn ${redlineMode === 'side' ? 'active' : ''}`} onClick={() => setRedlineMode('side')}>
                    Side-by-Side
                  </button>
                  <button className={`view-mode-btn ${redlineMode === 'inline' ? 'active' : ''}`} onClick={() => setRedlineMode('inline')}>
                    Inline Redline
                  </button>
                </div>
              </div>
            </div>

            {/* Summary Box */}
            <div style={{ background: 'var(--cyan-bg)', border: '1px solid var(--cyan-border)', borderRadius: 'var(--r-md)', padding: '16px 20px', marginBottom: '24px', fontSize: '12px', lineHeight: '1.6', color: 'var(--ink-mid)', fontFamily: "'Space Mono', monospace" }}>
              <strong style={{ color: 'var(--cyan)', display: 'block', marginBottom: '4px', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Comparison Summary</strong>
              {result.summary}
            </div>

            {/* Difference Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredDiffs.length === 0 ? (
                <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '30px', textAlign: 'center', color: 'var(--ink-dim)', fontFamily: "'Space Mono', monospace", fontSize: '12px' }}>
                  No differences match the selected filters.
                </div>
              ) : (
                filteredDiffs.map((diff) => (
                  <article className="diff-card" key={diff.id}>
                    <div className="diff-header">
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--ink-dim)' }}>
                        {diff.section}
                      </span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {diff.impact && (
                          <span
                            className="badge-diff"
                            style={
                              diff.impact === 'favorable'
                                ? { background: 'var(--sage-bg)', color: 'var(--sage)', borderColor: 'var(--sage-border)' }
                                : diff.impact === 'unfavorable'
                                ? { background: 'var(--rose-bg)', color: 'var(--rose)', borderColor: 'var(--rose-border)' }
                                : { background: 'var(--panel)', color: 'var(--ink-dim)', borderColor: 'var(--border)' }
                            }
                          >
                            {diff.impact === 'favorable' ? '✓ Favorable' : diff.impact === 'unfavorable' ? '▲ Unfavorable' : 'Neutral'}
                          </span>
                        )}
                        <span
                          className={`badge-diff ${
                            diff.type === 'added'
                              ? 'badge-added'
                              : diff.type === 'removed'
                              ? 'badge-removed'
                              : 'badge-modified'
                          }`}
                        >
                          {diff.type.replace('_', ' ')}
                        </span>
                        <span className={`severity-pill severity-${diff.severity}`}>
                          {diff.severity} risk
                        </span>
                      </div>
                    </div>
                    <h4 className="diff-title">{diff.title}</h4>
                    <p className="diff-desc">{diff.description}</p>
                    {(diff.baseText || diff.compareText) && (
                      redlineMode === 'side' ? (
                        <div className="diff-comparison-grid">
                          {diff.baseText && (
                            <div className="diff-pane diff-pane-base">
                              <span>Baseline ({result.baseDocName})</span>
                              "{diff.baseText}"
                            </div>
                          )}
                          {diff.compareText && (
                            <div className="diff-pane diff-pane-comp">
                              <span>Revised Draft ({result.compareDocName})</span>
                              "{diff.compareText}"
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="diff-pane diff-pane-comp" style={{ marginTop: '10px', fontFamily: "'Space Mono', monospace", lineHeight: '1.6' }}>
                          <span style={{ display: 'block', marginBottom: '6px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--amber)' }}>
                            INLINE REDLINE DIFF:
                          </span>
                          {diff.baseText && (
                            <span style={{ background: 'rgba(251, 113, 133, 0.18)', color: 'var(--rose)', textDecoration: 'line-through', padding: '2px 6px', borderRadius: '3px', marginRight: '6px' }}>
                              {diff.baseText}
                            </span>
                          )}
                          {diff.compareText && (
                            <span style={{ background: 'rgba(52, 211, 153, 0.18)', color: 'var(--sage)', padding: '2px 6px', borderRadius: '3px' }}>
                              {diff.compareText}
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </article>
                ))
              )}
            </div>
          </>
        )}

        <footer>
          ⓘ <strong>Legal Lens provides comparison information, not legal advice.</strong> Automated
          comparison detects clause patterns and revisions but may not capture jurisdictional nuances.
        </footer>
      </main>
    </AppShell>
  );
}
