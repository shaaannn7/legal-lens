import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import {
  DocumentMeta,
  DocumentAnalysis,
  DocumentInsight,
  ComparisonResult,
  InsightTaxonomy,
  ParsedSection,
  Obligation,
} from '@/types';
import { buildExecutiveBriefMarkdown, buildNegotiationLevers } from '@/services/exports';

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readerContainerRef = useRef<HTMLDivElement>(null);

  // Document collection state
  const [docList, setDocList] = useState<Array<{ document: DocumentMeta; analysis: DocumentAnalysis }>>([]);
  const [activeDocId, setActiveDocId] = useState<string>('');
  const [loadingDocs, setLoadingDocs] = useState<boolean>(true);
  const [uploadNotice, setUploadNotice] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);

  // Active document & analysis
  const activeItem = docList.find((item) => item.document.id === activeDocId) || docList[0];
  const activeDoc = activeItem?.document;
  const analysis = activeItem?.analysis;

  // Layout View Mode: 'split' | 'analysis' | 'reader'
  const [viewMode, setViewMode] = useState<'split' | 'analysis' | 'reader'>('split');

  // Taxonomy Filter
  const [selectedTaxonomy, setSelectedTaxonomy] = useState<'all' | InsightTaxonomy>('all');

  // Interactive Reader State
  const [highlightedSectionId, setHighlightedSectionId] = useState<string | null>(null);
  const [readerSearch, setReaderSearch] = useState<string>('');
  const [copyFeedback, setCopyFeedback] = useState<string>('');
  const [sectionNotes, setSectionNotes] = useState<Record<string, string>>({});
  const [editingNoteSecId, setEditingNoteSecId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState<string>('');

  // Selected Insight / Source View
  const [selectedInsightId, setSelectedInsightId] = useState<string>('');
  const [sourceView, setSourceView] = useState<{ title: string; quote: string; sub: string; sectionId?: string }>({
    title: 'Section 8 · Termination',
    quote: 'Either party may terminate this agreement with ninety (90) days written notice.',
    sub: 'Section 8 · Line coordinates active',
  });

  // Grounded Q&A State
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<string[]>([]);
  const [sourceExcerpt, setSourceExcerpt] = useState<string | undefined>();
  const [answerConfidence, setAnswerConfidence] = useState<'grounded' | 'synthesized' | 'not_found'>('grounded');
  const [answerSectionRef, setAnswerSectionRef] = useState<string | undefined>();
  const [answerLineRange, setAnswerLineRange] = useState<[number, number] | undefined>();
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');

  // Comparison Modal
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareDocId, setCompareDocId] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState('');

  // Actionable Brief Modal
  const [briefModal, setBriefModal] = useState<{
    open: boolean;
    title: string;
    content: React.ReactNode;
    markdown?: string;
  }>({
    open: false,
    title: '',
    content: null,
    markdown: '',
  });

  // Methodology Tooltip
  const [showMethodology, setShowMethodology] = useState(false);

  // Fetch initial documents from API
  useEffect(() => {
    async function fetchDocuments() {
      try {
        const res = await fetch('/api/documents');
        if (res.ok) {
          const data = await res.json();
          if (data.documents && data.documents.length > 0) {
            setDocList(data.documents);
            const queryDocId = typeof router.query.doc === 'string' ? router.query.doc : '';
            const target = data.documents.find((d: { document: DocumentMeta }) => d.document.id === queryDocId) || data.documents[0];
            setActiveDocId(target.document.id);
            if (target.analysis?.insights?.length > 0) {
              const firstIns = target.analysis.insights[0];
              setSelectedInsightId(firstIns.id);
              setSourceView({
                title: firstIns.sourceLabel,
                quote: firstIns.sourceExcerpt || firstIns.explanation,
                sub: `${firstIns.sourceLabel} · ${firstIns.lineRange ? `Lines ${firstIns.lineRange[0]}-${firstIns.lineRange[1]}` : 'Clause active'}`,
                sectionId: firstIns.sectionId,
              });
              if (firstIns.sectionId) {
                setHighlightedSectionId(firstIns.sectionId);
              }
            }
          }
        }
      } catch {
        // Fallback gracefully
      } finally {
        setLoadingDocs(false);
      }
    }
    if (router.isReady) {
      fetchDocuments();
    }
  }, [router.isReady, router.query.doc]);

  // Update source view and active section when active document changes
  useEffect(() => {
    if (analysis && analysis.insights && analysis.insights.length > 0) {
      const firstIns = analysis.insights[0];
      setSelectedInsightId(firstIns.id);
      setSourceView({
        title: firstIns.sourceLabel,
        quote: firstIns.sourceExcerpt || firstIns.explanation,
        sub: `${firstIns.sourceLabel} · ${firstIns.lineRange ? `Lines ${firstIns.lineRange[0]}-${firstIns.lineRange[1]}` : 'Active'}`,
        sectionId: firstIns.sectionId,
      });
      if (firstIns.sectionId) {
        setHighlightedSectionId(firstIns.sectionId);
      }
    }
    // Clear question/answer on doc change
    setAnswer('');
    setSources([]);
    setSourceExcerpt(undefined);
    setAnswerSectionRef(undefined);
    setAnswerLineRange(undefined);
    setAskError('');
    setReaderSearch('');
  }, [activeDocId]);

  // Keyboard shortcut: Escape closes modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowCompareModal(false);
        setBriefModal({ open: false, title: '', content: null });
        setShowMethodology(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Responsive default layout: split on desktop, analysis on mobile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1080) {
      setViewMode('analysis');
    }
  }, []);

  // Jump to specific section in Document Reader
  function jumpToSection(sectionId: string) {
    setHighlightedSectionId(sectionId);

    // If mobile or in analysis-only mode, switch to reader view so the user immediately sees the highlighted clause
    if (typeof window !== 'undefined' && window.innerWidth < 1080 && viewMode === 'analysis') {
      setViewMode('reader');
    }

    setTimeout(() => {
      const el = document.getElementById(`reader-sec-${sectionId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
  }

  // Insight Card Click Handler
  function handleSelectInsight(insight: DocumentInsight) {
    setSelectedInsightId(insight.id);
    setSourceView({
      title: insight.sourceLabel,
      quote: insight.sourceExcerpt || insight.explanation,
      sub: `${insight.sourceLabel} · ${insight.lineRange ? `Lines ${insight.lineRange[0]}-${insight.lineRange[1]}` : 'Clause active'}`,
      sectionId: insight.sectionId,
    });

    if (insight.sectionId) {
      jumpToSection(insight.sectionId);
    } else if (analysis?.sections) {
      // Find matching section by title or text
      const match = analysis.sections.find(
        (s) =>
          s.title.toLowerCase().includes(insight.sourceLabel.toLowerCase()) ||
          (insight.sourceExcerpt && s.content.includes(insight.sourceExcerpt.slice(0, 30))),
      );
      if (match) {
        jumpToSection(match.id);
      }
    }
  }

  // Upload Handler
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadNotice('');

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      const chunkSize = 0x8000;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
      }
      const content = btoa(binary);
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          content,
          fileType: file.name.split('.').pop() || 'txt',
          mimeType: file.type || undefined,
          sizeBytes: file.size,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload document.');

      setDocList((prev) => [data, ...prev]);
      setActiveDocId(data.document.id);
      setUploadNotice(`✓ "${file.name}" was extracted and is now active.`);
    } catch (err: unknown) {
      setUploadNotice(err instanceof Error ? err.message : 'Error uploading file.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // Delete Document
  async function handleDeleteDocument(id: string) {
    if (docList.length <= 1) {
      setUploadNotice('Cannot delete the only available document in workspace.');
      return;
    }
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const updated = docList.filter((item) => item.document.id !== id);
        setDocList(updated);
        setActiveDocId(updated[0].document.id);
        setUploadNotice('Document removed from workspace.');
      }
    } catch {
      setUploadNotice('Failed to remove document.');
    }
  }

  // Grounded Q&A Handler
  async function handleAsk(promptValue = question) {
    const trimmed = promptValue.trim();
    if (!trimmed || asking || !activeDoc) return;
    setQuestion(trimmed);
    setAsking(true);
    setAskError('');
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          documentId: activeDoc.id,
          filename: activeDoc.filename,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Analysis failed.');
      setAnswer(result.answer);
      setSources(result.sources || []);
      setSourceExcerpt(result.sourceExcerpt);
      setAnswerConfidence(result.confidence || 'grounded');
      setAnswerSectionRef(result.sectionReference);
      setAnswerLineRange(result.lineRange);

      if (result.sectionReference && analysis?.sections) {
        const matchingSec = analysis.sections.find(
          (s) =>
            s.title.toLowerCase().includes(result.sectionReference.toLowerCase()) ||
            (s.number && result.sectionReference.includes(s.number)) ||
            (result.sourceExcerpt && s.content.includes(result.sourceExcerpt.slice(0, 30))),
        );
        if (matchingSec) {
          jumpToSection(matchingSec.id);
        }
      }
    } catch (error) {
      setAskError(error instanceof Error ? error.message : 'Analysis failed.');
    } finally {
      setAsking(false);
    }
  }

  // Run Comparison
  async function handleRunComparison(targetCompDocId?: string) {
    if (!activeDoc) return;
    const targetId =
      targetCompDocId ||
      compareDocId ||
      docList.find((d) => d.document.id !== activeDoc.id)?.document.id ||
      activeDoc.id;

    setComparing(true);
    setCompareError('');
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseDocId: activeDoc.id,
          compareDocId: targetId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Comparison failed.');
      setComparisonResult(data);
      setShowCompareModal(true);
    } catch (err) {
      setCompareError(err instanceof Error ? err.message : 'Comparison failed.');
    } finally {
      setComparing(false);
    }
  }

  // Copy clause text to clipboard
  function handleCopyClause(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopyFeedback(`Copied ${label}`);
    setTimeout(() => setCopyFeedback(''), 2500);
  }

  // Actionable Brief Modal Triggers
  function showSummaryBrief() {
    if (!analysis || !activeDoc) return;
    const docName = activeDoc.filename.replace(/\.[^.]+$/, '');
    const md = buildExecutiveBriefMarkdown(activeDoc, analysis);

    setBriefModal({
      open: true,
      title: 'Executive One-Page Summary',
      markdown: md,
      content: (
        <div className="brief-box">
          <h3 style={{ color: 'var(--amber)', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', marginBottom: '8px' }}>
            {docName}
          </h3>
          <p><strong>Document Classification:</strong> {analysis.documentType || 'Commercial Agreement'}</p>
          <p><strong>Parties:</strong> {analysis.parties.join(' and ') || 'Not explicitly identified'}</p>
          <p><strong>Effective Date:</strong> {analysis.effectiveDate || 'Not specified'}</p>
          <p><strong>Renewal Terms:</strong> {analysis.renewalDate || 'Annual standard renewal'}</p>
          <p><strong>Governing Law:</strong> {analysis.jurisdiction || 'Delaware'}</p>
          <p><strong>Risk Posture:</strong> {analysis.scorecard?.overallRisk.toUpperCase()} ({analysis.scorecard?.riskScore || 50}/100 Risk Index)</p>
          <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: '14px 0' }} />
          <h4 style={{ color: 'var(--ink)', fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', margin: '12px 0 6px' }}>
            Executive Synthesis
          </h4>
          <p style={{ color: 'var(--ink-mid)', fontSize: '12px', lineHeight: '1.6' }}>{analysis.summary}</p>
          <h4 style={{ color: 'var(--ink)', fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', margin: '14px 0 8px' }}>
            Key Contractual Findings
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {analysis.insights.map((ins) => (
              <div key={ins.id} style={{ background: 'var(--panel)', padding: '10px 12px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <strong style={{ color: 'var(--amber)', fontSize: '12px' }}>{ins.title}</strong>
                <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: 'var(--ink-mid)' }}>
                  {ins.explanation} <span style={{ color: 'var(--ink-dim)', fontFamily: "'Space Mono', monospace" }}>({ins.sourceLabel})</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      ),
    });
  }

  function showLawyerQuestions() {
    if (!analysis || !activeDoc) return;
    const md = [
      `# Questions to Ask Your Legal Counsel`,
      `_${activeDoc.filename} · ${new Date().toLocaleDateString()}_`,
      '',
      'Bring these prioritized questions to your legal consultation to address identified liability carve-outs and operational constraints efficiently:',
      '',
      ...analysis.questionsForLawyer.map((q, idx) => `${idx + 1}. ${q}`),
      '',
      '> _Legal Lens provides informational analysis only, not legal advice._',
    ].join('\n');

    setBriefModal({
      open: true,
      title: 'Questions for Legal Counsel',
      markdown: md,
      content: (
        <div className="actionable-content">
          <p style={{ fontSize: '12px', color: 'var(--ink-mid)', marginBottom: '16px' }}>
            Bring these prioritized questions to your legal consultation to address identified liability carve-outs and operational constraints efficiently:
          </p>
          {analysis.questionsForLawyer.map((q, idx) => (
            <div className="item-row" key={idx}>
              <span className="item-num">{String(idx + 1).padStart(2, '0')}</span>
              <div>
                <strong style={{ fontSize: '12.5px', color: 'var(--ink)' }}>{q}</strong>
              </div>
            </div>
          ))}
        </div>
      ),
    });
  }

  function showNegotiationChecklist() {
    if (!analysis) return;
    const levers = buildNegotiationLevers(analysis);
    const md = [
      `# Pre-Signature Negotiation Checklist`,
      `_${activeDoc?.filename || 'Document'} · ${new Date().toLocaleDateString()}_`,
      '',
      '## Priority Negotiation Levers',
      ...levers.map(
        (l, i) =>
          `### ${i + 1}. ${l.title}\n- **Target Clause:** ${l.sourceLabel}\n- **Rationale:** ${l.rationale}\n` +
          (l.suggestedWording ? `- **Suggested Replacement Language:** "${l.suggestedWording}"\n` : ''),
      ),
      '',
      '> _Legal Lens provides informational analysis only, not legal advice._',
    ].join('\n');

    setBriefModal({
      open: true,
      title: 'Pre-Signature Negotiation Levers',
      markdown: md,
      content: (
        <div className="actionable-content">
          {levers.length === 0 ? (
            <p style={{ color: 'var(--ink-mid)' }}>No negotiation levers were detected for this document.</p>
          ) : (
            levers.map((lever, idx) => (
              <div className="item-row" key={lever.id || idx}>
                <span className="item-num">{String(idx + 1).padStart(2, '0')}</span>
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>{lever.title}</strong>
                  <p style={{ margin: '4px 0 0', color: 'var(--ink-mid)', fontSize: '12px' }}>
                    {lever.rationale}
                  </p>
                  <small style={{ color: 'var(--amber)', fontFamily: "'Space Mono', monospace", display: 'block', marginTop: '4px' }}>
                    Target: {lever.sourceLabel}
                  </small>
                  {lever.suggestedWording && (
                    <div style={{ marginTop: '8px', padding: '8px 10px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                      <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sage)', fontFamily: "'Space Mono', monospace", display: 'block', marginBottom: '2px' }}>
                        Suggested Alternative Language:
                      </span>
                      <p style={{ margin: 0, color: 'var(--ink-mid)', fontSize: '11px', fontStyle: 'italic' }}>
                        "{lever.suggestedWording}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ),
    });
  }

  function showObligationsModal() {
    if (!analysis) return;
    const md = [
      `# Contract Obligations & Milestones`,
      `_${activeDoc?.filename || 'Document'} · ${new Date().toLocaleDateString()}_`,
      '',
      ...analysis.obligations.map(
        (ob, i) =>
          `### ${i + 1}. [${ob.owner}] ${ob.action}\n- **Clause:** ${ob.sourceLabel}\n` +
          (ob.dueDate ? `- **Timeline / Due:** ${ob.dueDate}\n` : ''),
      ),
      '',
      '> _Legal Lens provides informational analysis only, not legal advice._',
    ].join('\n');

    setBriefModal({
      open: true,
      title: 'Contract Obligations & Milestones',
      markdown: md,
      content: (
        <div className="actionable-content">
          {analysis.obligations.length === 0 ? (
            <p style={{ color: 'var(--ink-mid)' }}>No specific obligations extracted for this document.</p>
          ) : (
            analysis.obligations.map((ob, idx) => (
              <div className="item-row" key={idx}>
                <span className="item-num">{String(idx + 1).padStart(2, '0')}</span>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="badge-diff badge-added">{ob.owner}</span>
                    <small style={{ color: 'var(--ink-dim)', fontFamily: "'Space Mono', monospace", fontSize: '10px' }}>
                      {ob.sourceLabel}
                    </small>
                  </div>
                  <p style={{ margin: '6px 0 2px', fontSize: '12px', fontWeight: 500, color: 'var(--ink)' }}>
                    {ob.action}
                  </p>
                  {ob.dueDate && (
                    <small style={{ color: 'var(--amber)', fontFamily: "'Space Mono', monospace", fontSize: '10px' }}>
                      Timeline: {ob.dueDate}
                    </small>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ),
    });
  }

  function showSigningChecklist() {
    if (!analysis || !activeDoc) return;
    const docName = activeDoc.filename.replace(/\.[^.]+$/, '');
    const md = [
      `# Pre-Signing Checklist — ${docName}`,
      `_Generated by Legal Lens · ${new Date().toLocaleDateString()}_`,
      '',
      '## Identity & Authority',
      '- [ ] Confirm full legal names and addresses of all signing parties',
      '- [ ] Verify each signatory has authority to bind their organisation',
      '- [ ] Confirm entity type is correct (LLC, Corp, etc.)',
      '',
      '## Key Terms Verified',
      `- [ ] Effective date confirmed: ${analysis.effectiveDate || 'not specified'}`,
      `- [ ] Governing law confirmed: ${analysis.jurisdiction || 'not specified'}`,
      `- [ ] Renewal / expiry noted: ${analysis.renewalDate || 'not specified'}`,
      '',
      '## Open Risk Items',
      ...analysis.insights
        .filter((i) => i.severity === 'high' || i.severity === 'medium')
        .map((i) => `- [ ] **${i.title}** — ${i.explanation}`),
      '',
      '## Obligations Assigned',
      ...analysis.obligations.map((o) => `- [ ] [${o.owner}] ${o.action}${o.dueDate ? ` — due ${o.dueDate}` : ''}`),
      '',
      '## Legal Review',
      '- [ ] Independent legal counsel has reviewed final draft',
      '- [ ] All negotiated changes are reflected in this version',
      '- [ ] Exhibits and schedules are attached and initialled',
      '',
      '> _Legal Lens provides informational analysis only, not legal advice._',
    ].join('\n');

    setBriefModal({
      open: true,
      title: 'Pre-Signing Checklist',
      markdown: md,
      content: (
        <div className="actionable-content">
          <p style={{ fontSize: '12px', color: 'var(--ink-mid)', marginBottom: '16px' }}>
            Work through each item with your legal counsel before execution. Download as Markdown to track progress in your editor:
          </p>
          {[
            {
              section: 'Identity & Authority',
              items: [
                'Confirm full legal names and addresses of all signing parties',
                'Verify each signatory has authority to bind their organisation',
                'Confirm entity type is correct (LLC, Corp, etc.)',
              ],
            },
            {
              section: 'Key Terms Verified',
              items: [
                `Effective date: ${analysis.effectiveDate || 'not specified'}`,
                `Governing law: ${analysis.jurisdiction || 'not specified'}`,
                `Renewal / expiry: ${analysis.renewalDate || 'not specified'}`,
              ],
            },
            {
              section: 'Open Risk Items',
              items: analysis.insights
                .filter((i) => i.severity === 'high' || i.severity === 'medium')
                .map((i) => `${i.title} — ${i.explanation}`),
            },
            {
              section: 'Legal Review',
              items: [
                'Independent legal counsel has reviewed final draft',
                'All negotiated changes are reflected in this version',
                'Exhibits and schedules are attached and initialled',
              ],
            },
          ].map((group) => (
            <div key={group.section} style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '10px', fontFamily: "'Space Mono', monospace", color: 'var(--sage)', fontWeight: 700, margin: '0 0 8px', letterSpacing: '0.06em' }}>
                {group.section.toUpperCase()}
              </p>
              {group.items.map((item, idx) => (
                <div key={idx} className="item-row" style={{ cursor: 'default' }}>
                  <span style={{ fontSize: '16px', color: 'var(--ink-dim)', lineHeight: 1 }}>☐</span>
                  <span style={{ fontSize: '12px', color: 'var(--ink-mid)' }}>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ),
    });
  }

  function showKeyDates() {
    if (!analysis || !activeDoc) return;
    const dates: { label: string; value: string; note: string; icon: string }[] = [];
    if (analysis.effectiveDate) dates.push({ label: 'Effective Date', value: analysis.effectiveDate, note: 'Agreement comes into force', icon: '📅' });
    if (analysis.renewalDate) dates.push({ label: 'Renewal / Expiry', value: analysis.renewalDate, note: 'Auto-renewal or expiry window', icon: '🔄' });
    analysis.obligations.forEach((o) => {
      if (o.dueDate) dates.push({ label: o.action.substring(0, 60) + (o.action.length > 60 ? '…' : ''), value: o.dueDate, note: `Assigned to: ${o.owner}`, icon: '⚡' });
    });

    setBriefModal({
      open: true,
      title: 'Key Dates & Obligations Timeline',
      content: (
        <div className="actionable-content">
          {dates.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--ink-mid)' }}>
              No explicit dates found in this document. The agreement may use relative timelines (e.g., &quot;90 days after signing&quot;).
            </p>
          ) : (
            dates.map((d, idx) => (
              <div className="item-row" key={idx}>
                <span style={{ fontSize: '20px', lineHeight: 1 }}>{d.icon}</span>
                <div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: 'var(--amber)', fontWeight: 700 }}>
                      {d.value}
                    </span>
                    <strong style={{ fontSize: '12px', color: 'var(--ink)' }}>{d.label}</strong>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--ink-mid)' }}>{d.note}</p>
                </div>
              </div>
            ))
          )}
        </div>
      ),
    });
  }

  // Save current Q&A answer to localStorage
  function saveCurrentQA() {
    if (!answer || !question || !activeDoc) return;
    try {
      const key = 'legallens_saved_qa';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const entry = {
        id: `sq_${Date.now()}`,
        docTitle: activeDoc.filename,
        question,
        answer,
        source: sources.join(', ') || 'Document analysis',
        savedAt: new Date().toISOString().slice(0, 10),
      };
      localStorage.setItem(key, JSON.stringify([entry, ...existing].slice(0, 50)));
      setSaveNotice('✓ Saved to your research repository');
      setTimeout(() => setSaveNotice(''), 3000);
    } catch {
      setSaveNotice('Could not save — storage unavailable');
      setTimeout(() => setSaveNotice(''), 3000);
    }
  }

  // Helper for search match highlighting in reader
  function highlightTextWithSearch(text: string, query: string) {
    if (!query || !query.trim()) return text;
    const q = query.trim();
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="search-match-highlight">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  }

  // Filter insights by selected taxonomy
  const allInsights = analysis?.insights || [];
  const filteredInsights =
    selectedTaxonomy === 'all'
      ? allInsights
      : allInsights.filter((ins) => ins.taxonomy === selectedTaxonomy);

  const taxonomyCounts = {
    all: allInsights.length,
    extracted_fact: allInsights.filter((i) => i.taxonomy === 'extracted_fact').length,
    inferred_interpretation: allInsights.filter((i) => i.taxonomy === 'inferred_interpretation').length,
    missing_information: allInsights.filter((i) => i.taxonomy === 'missing_information').length,
    negotiation_suggestion: allInsights.filter((i) => i.taxonomy === 'negotiation_suggestion').length,
  };

  // Sections list for reader
  const sectionsToRender: ParsedSection[] =
    analysis?.sections && analysis.sections.length > 0
      ? analysis.sections
      : activeDoc?.extractedText
      ? [
          {
            id: 'sec_full_text',
            title: 'Agreement Full Text',
            content: activeDoc.extractedText,
            startLine: 1,
            endLine: activeDoc.extractedText.split('\n').length,
          },
        ]
      : [];

  const scorecard = analysis?.scorecard || {
    overallRisk: 'medium',
    riskScore: 52,
    criticalCount: allInsights.filter((i) => i.severity === 'high').length,
    moderateCount: allInsights.filter((i) => i.severity === 'medium').length,
    lowCount: allInsights.filter((i) => i.severity === 'low').length,
    summary: 'Standard commercial risk profile with active termination buffers and indemnity obligations.',
  };

  return (
    <AppShell onUploadClick={() => fileInputRef.current?.click()} uploading={uploading}>
      <main className="workspace workspace-fade-in">
        {/* Workspace Top Bar */}
        <header className="topbar">
          <div>
            <p className="eyebrow">LEGAL LENS · CONTRACT INTELLIGENCE WORKSTATION</p>
            <h1>Contract Intelligence</h1>
          </div>
          <div className="topbar-actions">
            {/* View Mode Toggle */}
            <div className="view-mode-toggle" role="group" aria-label="Workstation View Layout">
              <button
                className={`view-mode-btn ${viewMode === 'split' ? 'active' : ''}`}
                onClick={() => setViewMode('split')}
                title="Synchronized Split-View: Analysis & Reader"
              >
                Split View
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'analysis' ? 'active' : ''}`}
                onClick={() => setViewMode('analysis')}
                title="Focus on Forensic Insights & Scorecard"
              >
                Analysis
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'reader' ? 'active' : ''}`}
                onClick={() => setViewMode('reader')}
                title="Focus on Full Document Text & Clause Verification"
              >
                Document Reader
              </button>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="primary"
              aria-label="Upload document"
            >
              {uploading ? 'Analyzing…' : '↑ Add Document'}
            </button>
            <span className="avatar" title="Active Legal Reviewer">LR</span>
          </div>
        </header>

        {/* Document Selection and Status Bar */}
        <div className="doc-bar">
          {docList.length > 1 && (
            <div className="doc-switcher">
              <span className="doc-switcher-label">AGREEMENTS:</span>
              {docList.map((item) => (
                <button
                  key={item.document.id}
                  className={`doc-pill ${item.document.id === activeDocId ? 'active' : ''}`}
                  onClick={() => setActiveDocId(item.document.id)}
                >
                  <span>{item.document.fileType === 'pdf' ? '📄' : '📝'}</span>
                  {item.document.filename}
                </button>
              ))}
            </div>
          )}

          {activeDoc && (
            <section className="document">
              <div>
                <span className={activeDoc.fileType === 'pdf' ? 'pdf' : 'txt-badge'}>
                  {activeDoc.fileType.toUpperCase()}
                </span>
                <span>
                  <b>{activeDoc.filename.replace(/\.[^.]+$/, '')}</b>
                  <small>
                    {activeDoc.extractionStatus === 'complete'
                      ? `Extracted · ${activeDoc.pageCount || 1} pages · ${(activeDoc.sizeBytes / 1024).toFixed(0)} KB · Analysis active`
                      : `Upload registered · ${(activeDoc.sizeBytes / 1024).toFixed(0)} KB · Demo mode`}
                  </small>
                </span>
              </div>
              <div className="doc-actions">
                <span className={activeDoc.extractionStatus === 'complete' ? 'ready' : 'status-tag-demo'}>
                  {activeDoc.extractionStatus === 'complete' ? '● READY TO EXPLORE' : '○ DEMO MODE'}
                </span>
                <Link href={`/compare?base=${activeDoc.id}`} className="outline-btn" style={{ textDecoration: 'none' }}>
                  Compare Draft
                </Link>
                {docList.length > 1 && (
                  <button
                    onClick={() => handleDeleteDocument(activeDoc.id)}
                    title="Remove document from workspace"
                    style={{ color: 'var(--rose)' }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </section>
          )}

          {uploadNotice && (
            <div className="upload-notice">
              <span>{uploadNotice}</span>
              <button onClick={() => setUploadNotice('')}>Dismiss</button>
            </div>
          )}
        </div>

        {/* Actionable Outputs Quick Bar */}
        <div className="actionable-bar">
          <span className="doc-switcher-label">ACTIONABLE OUTPUTS:</span>
          <button className="actionable-btn" onClick={showSummaryBrief}>
            📋 One-Page Summary
          </button>
          <button className="actionable-btn" onClick={showLawyerQuestions}>
            ⚖️ Questions for Lawyer ({analysis?.questionsForLawyer.length || 0})
          </button>
          <button className="actionable-btn" onClick={showNegotiationChecklist}>
            🤝 Negotiation Checklist
          </button>
          <button className="actionable-btn" onClick={showObligationsModal}>
            📅 Obligations ({analysis?.obligations.length || 0})
          </button>
          <button className="actionable-btn" onClick={showSigningChecklist}>
            ✅ Signing Checklist
          </button>
          <button className="actionable-btn" onClick={showKeyDates}>
            🗓 Key Dates
          </button>
        </div>

        {/* WORKSPACE MAIN SPLIT VIEW */}
        {loadingDocs ? (
          <div className="workspace-split" style={{ opacity: 0.6 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: i === 1 ? '160px' : '100px', width: '100%' }} />
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton" style={{ height: '64px', width: '100%' }} />
              ))}
            </div>
          </div>
        ) : (
        <div
          className={`workspace-split ${
            viewMode === 'analysis' ? 'workspace-analysis-only' : viewMode === 'reader' ? 'workspace-reader-only' : ''
          }`}
          style={
            viewMode === 'analysis'
              ? { gridTemplateColumns: '1fr' }
              : viewMode === 'reader'
              ? { gridTemplateColumns: '1fr' }
              : undefined
          }
        >
          {/* LEFT COLUMN: FORENSIC ANALYSIS & GROUNDED INTELLIGENCE */}
          {(viewMode === 'split' || viewMode === 'analysis') && (
            <div className="analysis-column" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Forensic Risk Scorecard Widget */}
              <div className={`risk-scorecard-widget risk-scorecard-${scorecard.overallRisk}`}>
                <div className="scorecard-header">
                  <div className="scorecard-title">
                    <span>FORENSIC RISK ASSESSMENT</span>
                    <span className={`score-badge score-badge-${scorecard.overallRisk}`}>
                      {scorecard.overallRisk.toUpperCase()} RISK · {scorecard.riskScore}/100 INDEX
                    </span>
                  </div>
                  <button
                    onClick={() => setShowMethodology(!showMethodology)}
                    style={{ background: 'none', border: 0, padding: 0, fontSize: '11px', color: 'var(--amber)', cursor: 'pointer', fontFamily: "'Space Mono', monospace" }}
                    title="View methodology"
                  >
                    ⓘ Methodology
                  </button>
                </div>

                {showMethodology && (
                  <div id="methodology-tip" style={{ background: 'var(--canvas-subtle)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px', fontSize: '11.5px', color: 'var(--ink-mid)' }}>
                    <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px', fontFamily: "'Space Grotesk', sans-serif" }}>
                      Deterministic Grounding &amp; Scoring Methodology
                    </strong>
                    Scoring applies deterministic weights to contractual clause risk tiers. Direct citations reference exact line coordinates in the reader pane.
                  </div>
                )}

                {/* Visual Risk Gauge Meter */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontFamily: "'Space Mono', monospace", color: 'var(--ink-dim)', letterSpacing: '0.05em' }}>
                    <span>LOW EXPOSURE (0)</span>
                    <span>BALANCED (50)</span>
                    <span>HIGH HAZARD (100)</span>
                  </div>
                  <div style={{ width: '100%', height: '7px', background: 'var(--canvas-subtle)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(5, scorecard.riskScore))}%`,
                        height: '100%',
                        background:
                          scorecard.overallRisk === 'high'
                            ? 'linear-gradient(90deg, #f5b63c 0%, #fb7185 100%)'
                            : scorecard.overallRisk === 'low'
                            ? 'linear-gradient(90deg, #2dd4bf 0%, #34d399 100%)'
                            : 'linear-gradient(90deg, #2dd4bf 0%, #f5b63c 100%)',
                        borderRadius: '4px',
                        boxShadow:
                          scorecard.overallRisk === 'high'
                            ? '0 0 10px rgba(251, 113, 133, 0.4)'
                            : '0 0 10px rgba(245, 182, 60, 0.3)',
                        transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    />
                  </div>
                </div>

                <div className="scorecard-metrics">
                  <div className="metric-box">
                    <span className="metric-num" style={{ color: 'var(--rose)' }}>{scorecard.criticalCount}</span>
                    <span className="metric-label">Critical Risks</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-num" style={{ color: 'var(--amber)' }}>{scorecard.moderateCount}</span>
                    <span className="metric-label">Moderate Flags</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-num" style={{ color: 'var(--sage)' }}>{scorecard.lowCount}</span>
                    <span className="metric-label">Protections &amp; Low</span>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '12px', color: 'var(--ink-mid)', lineHeight: '1.5' }}>
                  {scorecard.summary}
                </p>
              </div>

              {/* Taxonomy Filter Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <p className="eyebrow">CLAUSE TAXONOMY</p>
                    <h2 style={{ fontSize: '18px', margin: 0, color: 'var(--ink)' }}>Identified Provisions</h2>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--ink-dim)', fontFamily: "'Space Mono', monospace" }}>
                    Showing {filteredInsights.length} of {allInsights.length}
                  </span>
                </div>

                <div className="taxonomy-tabs" role="tablist" aria-label="Taxonomy Filter Tabs">
                  <button
                    className={`taxonomy-tab ${selectedTaxonomy === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedTaxonomy('all')}
                  >
                    All ({taxonomyCounts.all})
                  </button>
                  <button
                    className={`taxonomy-tab ${selectedTaxonomy === 'extracted_fact' ? 'active' : ''}`}
                    onClick={() => setSelectedTaxonomy('extracted_fact')}
                  >
                    Extracted Facts ({taxonomyCounts.extracted_fact})
                  </button>
                  <button
                    className={`taxonomy-tab ${selectedTaxonomy === 'inferred_interpretation' ? 'active' : ''}`}
                    onClick={() => setSelectedTaxonomy('inferred_interpretation')}
                  >
                    Inferred Risks ({taxonomyCounts.inferred_interpretation})
                  </button>
                  <button
                    className={`taxonomy-tab ${selectedTaxonomy === 'missing_information' ? 'active' : ''}`}
                    onClick={() => setSelectedTaxonomy('missing_information')}
                  >
                    Missing Protections ({taxonomyCounts.missing_information})
                  </button>
                  <button
                    className={`taxonomy-tab ${selectedTaxonomy === 'negotiation_suggestion' ? 'active' : ''}`}
                    onClick={() => setSelectedTaxonomy('negotiation_suggestion')}
                  >
                    Negotiation Levers ({taxonomyCounts.negotiation_suggestion})
                  </button>
                </div>

                {/* Insights Cards Grid */}
                <div className="cards" style={{ marginTop: '12px' }}>
                  {filteredInsights.length > 0 ? (
                    filteredInsights.map((insight, index) => {
                      const toneClass = index === 0 ? '' : index === 1 ? 'tone-1' : index === 2 ? 'tone-2' : 'tone-3';
                      const isSelected = insight.id === selectedInsightId;
                      return (
                        <article
                          className={`insight ${toneClass} ${isSelected ? 'active' : ''}`}
                          key={insight.id}
                          onClick={() => handleSelectInsight(insight)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && handleSelectInsight(insight)}
                          title="Click to jump and highlight corresponding clause in Document Reader"
                        >
                          <div className="insight-top">
                            <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '9px' }}>
                              {insight.taxonomy ? insight.taxonomy.replace('_', ' ') : insight.category}
                            </span>
                            {insight.severity && (
                              <span className={`severity-pill severity-${insight.severity}`}>
                                {insight.severity} risk
                              </span>
                            )}
                          </div>
                          <h3>{insight.title}</h3>
                          <p>{insight.explanation}</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                            <small>{insight.sourceLabel}</small>
                            <span style={{ fontSize: '10px', color: 'var(--amber)', fontFamily: "'Space Mono', monospace" }}>
                              Jump to text →
                            </span>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div style={{ padding: '24px', gridColumn: '1 / -1', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                      <p style={{ margin: 0, color: 'var(--ink-dim)', fontSize: '12px' }}>
                        No clauses match the selected taxonomy filter. Select &quot;All&quot; above to view all extracted insights.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Milestones & Obligations Timeline */}
              {analysis?.obligations && analysis.obligations.length > 0 && (
                <div>
                  <p className="eyebrow">CONTRACT LEDGER</p>
                  <h2 style={{ fontSize: '18px', margin: '0 0 10px', color: 'var(--ink)' }}>Milestones &amp; Responsibilities</h2>
                  <div className="milestone-timeline">
                    {analysis.obligations.map((ob, idx) => (
                      <div
                        key={idx}
                        className="milestone-item"
                        onClick={() => {
                          if (analysis.sections) {
                            const match = analysis.sections.find(
                              (s) =>
                                s.title.toLowerCase().includes(ob.sourceLabel.toLowerCase()) ||
                                s.content.includes(ob.action.slice(0, 30)),
                            );
                            if (match) jumpToSection(match.id);
                          }
                        }}
                        title="Click to view clause in reader"
                      >
                        <div className={`milestone-dot ${idx % 2 === 1 ? 'milestone-dot-cyan' : ''}`} />
                        <div className="milestone-details">
                          <div className="milestone-header">
                            <span className="badge-diff badge-added">{ob.owner}</span>
                            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: 'var(--ink-dim)' }}>
                              {ob.sourceLabel}
                            </span>
                          </div>
                          <p style={{ margin: '4px 0 2px', fontSize: '12px', color: 'var(--ink)' }}>{ob.action}</p>
                          {ob.dueDate && (
                            <small style={{ color: 'var(--amber)', fontFamily: "'Space Mono', monospace", fontSize: '10px' }}>
                              Timeline: {ob.dueDate}
                            </small>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Source View & Ask Panel */}
              <section className="lower" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
                {/* Source View Callout */}
                <article className="source">
                  <p className="eyebrow">GROUNDED CITATION · {sourceView.title}</p>
                  <h2>{sourceView.title}</h2>
                  <blockquote>“{sourceView.quote}”</blockquote>
                  <div className="source-actions">
                    <small>{sourceView.sub}</small>
                    {sourceView.sectionId && (
                      <button onClick={() => jumpToSection(sourceView.sectionId!)}>
                        Jump to Clause in Reader →
                      </button>
                    )}
                  </div>
                </article>

                {/* Grounded Q&A Assistant */}
                <article className="ask">
                  <p className="eyebrow">GROUNDED CONTRACT Q&amp;A</p>
                  <h2>Ask Your Document</h2>
                  <div className="ask-prompts">
                    {[
                      'What can I negotiate before signing?',
                      'Summarize my obligations in plain English',
                      'When can either party terminate?',
                      'What is the liability cap?',
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        className="prompt-btn"
                        onClick={() => handleAsk(prompt)}
                        disabled={asking}
                      >
                        {prompt} ↗
                      </button>
                    ))}
                  </div>

                  {asking && (
                    <p className="answer" style={{ color: 'var(--amber)' }}>
                      Scanning document clauses and calculating grounding…
                    </p>
                  )}

                  {answer && !asking && (
                    <div className={answerConfidence === 'not_found' ? 'answer-not-found' : 'answer'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span
                          className={`score-badge ${
                            answerConfidence === 'grounded'
                              ? 'score-badge-low'
                              : answerConfidence === 'synthesized'
                              ? 'score-badge-medium'
                              : 'score-badge-high'
                          }`}
                          style={{ fontSize: '9px', padding: '2px 8px' }}
                        >
                          {answerConfidence === 'grounded'
                            ? '● GROUNDED IN TEXT'
                            : answerConfidence === 'synthesized'
                            ? '▲ SYNTHESIZED CLAUSE MATCH'
                            : '○ PROVISION NOT FOUND'}
                        </span>

                        {answerSectionRef && (
                          <button
                            onClick={() => {
                              const match = analysis?.sections?.find(
                                (s) =>
                                  s.title.toLowerCase().includes(answerSectionRef.toLowerCase()) ||
                                  (sourceExcerpt && s.content.includes(sourceExcerpt.slice(0, 30))),
                              );
                              if (match) jumpToSection(match.id);
                            }}
                            style={{ background: 'none', border: 0, color: 'var(--amber)', fontSize: '11px', cursor: 'pointer', fontFamily: "'Space Mono', monospace" }}
                          >
                            Jump to {answerSectionRef} →
                          </button>
                        )}
                      </div>

                      <p style={{ margin: 0 }}>{answer}</p>

                      {sourceExcerpt && answerConfidence !== 'not_found' && (
                        <div className="source-excerpt-box" style={{ marginTop: '10px' }}>
                          <strong>Cited Document Clause:</strong> &quot;{sourceExcerpt}&quot;
                        </div>
                      )}

                      {answerConfidence !== 'not_found' && (
                        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            onClick={saveCurrentQA}
                            style={{
                              fontSize: '11px',
                              padding: '5px 12px',
                              background: 'var(--panel-raised)',
                              border: '1px solid var(--border)',
                              borderRadius: '5px',
                              color: 'var(--sage)',
                              cursor: 'pointer',
                              fontFamily: "'Space Mono', monospace",
                            }}
                          >
                            ＋ Save to Research
                          </button>
                          {saveNotice && (
                            <span style={{ fontSize: '11px', color: 'var(--sage)', fontFamily: "'Space Mono', monospace" }}>
                              {saveNotice}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {sources.length > 0 && !asking && (
                    <div className="sources">
                      <strong>Sources:</strong>
                      {sources.map((source) => (
                        <span key={source}>{source}</span>
                      ))}
                    </div>
                  )}

                  {askError && <p className="ask-error">{askError}</p>}

                  <form
                    onSubmit={(e: FormEvent<HTMLFormElement>) => {
                      e.preventDefault();
                      handleAsk();
                    }}
                  >
                    <input
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask anything about liabilities, renewal, or terms…"
                      aria-label="Ask a question about this document"
                    />
                    <button disabled={asking} type="submit" aria-label="Submit question">
                      ↑
                    </button>
                  </form>
                </article>
              </section>
            </div>
          )}

          {/* RIGHT COLUMN: INTERACTIVE DOCUMENT READER WITH CLAUSE JUMPING */}
          {(viewMode === 'split' || viewMode === 'reader') && (
            <div className="reader-column">
              <aside className="doc-reader-pane">
                {/* Reader Header */}
                <div className="doc-reader-header">
                  <div className="doc-reader-titlebar">
                    <div>
                      <p className="eyebrow" style={{ margin: 0 }}>LIVE DOCUMENT READER</p>
                      <h3>{activeDoc?.filename || 'Document Text'}</h3>
                    </div>
                    <div className="doc-reader-controls">
                      {copyFeedback && (
                        <span style={{ color: 'var(--sage)', fontSize: '10px', fontFamily: "'Space Mono', monospace" }}>
                          {copyFeedback}
                        </span>
                      )}
                      <span className="reader-line-badge">
                        {sectionsToRender.length} Sections · {activeDoc?.pageCount || 1} pp
                      </span>
                    </div>
                  </div>

                  {/* In-Reader Search */}
                  <div>
                    <input
                      type="text"
                      className="reader-search-input"
                      placeholder="Search within agreement text…"
                      value={readerSearch}
                      onChange={(e) => setReaderSearch(e.target.value)}
                    />
                  </div>

                  {/* Section Jump Pills Bar */}
                  {sectionsToRender.length > 1 && (
                    <div className="doc-reader-sections-bar">
                      {sectionsToRender.map((sec) => (
                        <button
                          key={sec.id}
                          className={`section-jump-pill ${highlightedSectionId === sec.id ? 'active' : ''}`}
                          onClick={() => jumpToSection(sec.id)}
                          title={`Jump to ${sec.title}`}
                        >
                          {sec.number ? `§ ${sec.number}` : sec.title.slice(0, 16)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reader Body */}
                <div className="doc-reader-body" ref={readerContainerRef}>
                  {sectionsToRender.length === 0 ? (
                    <p style={{ color: 'var(--ink-dim)', textAlign: 'center', margin: '40px 0' }}>
                      No extracted document text available.
                    </p>
                  ) : (
                    sectionsToRender.map((sec) => {
                      const isHighlighted = highlightedSectionId === sec.id;
                      const matchingInsight = allInsights.find(
                        (ins) => ins.sectionId === sec.id || ins.sourceLabel.toLowerCase().includes(sec.title.toLowerCase()),
                      );
                      const riskClass = matchingInsight
                        ? matchingInsight.severity === 'high'
                          ? 'clause-risk-high'
                          : matchingInsight.severity === 'medium'
                          ? 'clause-risk-medium'
                          : 'clause-risk-low'
                        : '';
                      const existingNote = sectionNotes[sec.id];
                      const isEditingNote = editingNoteSecId === sec.id;

                      return (
                        <section
                          id={`reader-sec-${sec.id}`}
                          key={sec.id}
                          className={`reader-section-block ${isHighlighted ? 'clause-highlight-active' : ''} ${riskClass}`}
                        >
                          <div className="reader-section-heading">
                            <span>{sec.title}</span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {matchingInsight?.severity && (
                                <span className={`severity-pill severity-${matchingInsight.severity}`}>
                                  {matchingInsight.severity} risk
                                </span>
                              )}
                              <span className="reader-line-badge">
                                L{sec.startLine}–L{sec.endLine}
                              </span>
                              <button
                                onClick={() => handleCopyClause(sec.content, sec.title)}
                                style={{
                                  background: 'none',
                                  border: '1px solid var(--border)',
                                  borderRadius: '3px',
                                  padding: '2px 6px',
                                  fontSize: '9px',
                                  color: 'var(--ink-dim)',
                                  cursor: 'pointer',
                                  fontFamily: "'Space Mono', monospace",
                                }}
                                title="Copy clause text"
                              >
                                Copy
                              </button>
                              <button
                                onClick={() => {
                                  setEditingNoteSecId(sec.id);
                                  setNoteInput(existingNote || '');
                                }}
                                style={{
                                  background: 'none',
                                  border: '1px solid var(--border)',
                                  borderRadius: '3px',
                                  padding: '2px 6px',
                                  fontSize: '9px',
                                  color: 'var(--amber)',
                                  cursor: 'pointer',
                                  fontFamily: "'Space Mono', monospace",
                                }}
                                title="Add private note to clause"
                              >
                                {existingNote ? '✏ Note' : '＋ Note'}
                              </button>
                            </div>
                          </div>

                          <div className="reader-paragraph">
                            {highlightTextWithSearch(sec.content, readerSearch)}
                          </div>

                          {isEditingNote && (
                            <div style={{ marginTop: '10px', background: 'var(--canvas)', border: '1px solid var(--amber-border)', padding: '10px', borderRadius: '6px' }}>
                              <label style={{ display: 'block', fontSize: '10px', color: 'var(--amber)', fontFamily: "'Space Mono', monospace", marginBottom: '4px' }}>
                                PRIVATE CLAUSE ANNOTATION:
                              </label>
                              <input
                                type="text"
                                value={noteInput}
                                onChange={(e) => setNoteInput(e.target.value)}
                                placeholder="Add internal note or legal reviewer comment..."
                                style={{ width: '100%', marginBottom: '6px', fontSize: '12px' }}
                                autoFocus
                              />
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  className="primary"
                                  style={{ padding: '4px 10px', fontSize: '10px' }}
                                  onClick={() => {
                                    setSectionNotes((prev) => ({ ...prev, [sec.id]: noteInput }));
                                    setEditingNoteSecId(null);
                                  }}
                                >
                                  Save Note
                                </button>
                                <button
                                  className="outline-btn"
                                  style={{ padding: '4px 8px', fontSize: '10px' }}
                                  onClick={() => setEditingNoteSecId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {existingNote && !isEditingNote && (
                            <div className="clause-note-box">
                              <strong>Note:</strong> {existingNote}
                            </div>
                          )}
                        </section>
                      );
                    })
                  )}
                </div>
              </aside>
            </div>
          )}
        </div>
        )} {/* end loadingDocs ternary */}

        {/* Footer */}
        <footer>
          ⓘ <strong>Legal Lens provides information, not legal advice.</strong> For decisions
          that affect your rights or obligations, consider speaking with a qualified legal professional.
        </footer>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          className="hidden"
          type="file"
          accept=".txt,.pdf,.doc,.docx"
          onChange={handleFileUpload}
        />
      </main>

      {/* Comparison Modal */}
      {showCompareModal && (
        <div className="modal" onClick={() => setShowCompareModal(false)}>
          <div
            className="modal-card modal-card-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="sheet-handle" />
            <button
              className="close"
              onClick={() => setShowCompareModal(false)}
              aria-label="Close modal"
            >
              ×
            </button>
            <p className="eyebrow">CONTRACT REVISION COMPARISON</p>
            <h2>Spot the meaningful differences.</h2>
            <p>
              Legal Lens lines up changed clauses, new obligations, and removed protections
              between drafts so you know where risk has shifted.
            </p>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', margin: '16px 0', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: 'var(--ink-dim)', fontFamily: "'Space Mono', monospace" }}>
                COMPARE:
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>{activeDoc?.filename}</span>
              <span style={{ fontSize: '11px', color: 'var(--ink-dim)' }}>against</span>
              <select
                value={compareDocId || (docList.find((d) => d.document.id !== activeDoc?.id)?.document.id) || ''}
                onChange={(e) => {
                  setCompareDocId(e.target.value);
                  handleRunComparison(e.target.value);
                }}
                style={{
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  color: 'var(--ink)',
                }}
              >
                {docList.map((d) => (
                  <option key={d.document.id} value={d.document.id}>
                    {d.document.filename}
                  </option>
                ))}
              </select>
            </div>

            {compareError && <p className="ask-error">{compareError}</p>}

            {comparisonResult && (
              <>
                <div style={{ background: 'var(--cyan-bg)', border: '1px solid var(--cyan-border)', borderRadius: '6px', padding: '12px', fontSize: '12px', color: 'var(--ink-mid)' }}>
                  <strong style={{ color: 'var(--cyan)', display: 'block', marginBottom: '4px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Comparison Summary:
                  </strong>
                  {comparisonResult.summary}
                </div>

                <div className="diff-list">
                  {comparisonResult.differences.map((diff) => (
                    <article className="diff-card" key={diff.id}>
                      <div className="diff-header">
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--ink-dim)' }}>
                          {diff.section}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
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
                        <div className="diff-comparison-grid">
                          {diff.baseText && (
                            <div className="diff-pane diff-pane-base">
                              <span>Prior Draft / Baseline</span>
                              &quot;{diff.baseText}&quot;
                            </div>
                          )}
                          {diff.compareText && (
                            <div className="diff-pane diff-pane-comp">
                              <span>Revised Clause</span>
                              &quot;{diff.compareText}&quot;
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="primary" onClick={() => setShowCompareModal(false)}>
                Done Reviewing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actionable Brief Modal */}
      {briefModal.open && (
        <div className="modal" onClick={() => setBriefModal({ open: false, title: '', content: null })}>
          <div
            className="modal-card modal-card-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="sheet-handle" />
            <button
              className="close"
              onClick={() => setBriefModal({ open: false, title: '', content: null })}
              aria-label="Close modal"
            >
              ×
            </button>
            <p className="eyebrow">ACTIONABLE BRIEF</p>
            <h2>{briefModal.title}</h2>
            {briefModal.content}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
              {briefModal.markdown && (
                <button
                  className="outline-btn"
                  onClick={() => {
                    const blob = new Blob([briefModal.markdown || ''], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${briefModal.title.replace(/\s+/g, '-').toLowerCase()}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  ↓ Download .md
                </button>
              )}
              <button
                className="outline-btn"
                onClick={() => {
                  const text =
                    briefModal.markdown ||
                    `Legal Lens — ${briefModal.title}\nDocument: ${activeDoc?.filename}\nDate: ${new Date().toLocaleDateString()}`;
                  navigator.clipboard.writeText(text);
                  setCopyFeedback('Copied to clipboard');
                  setTimeout(() => setCopyFeedback(''), 2500);
                }}
              >
                Copy to Clipboard
              </button>
              <button
                className="primary"
                onClick={() => setBriefModal({ open: false, title: '', content: null })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
