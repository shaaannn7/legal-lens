import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { DocumentMeta, DocumentAnalysis } from '@/types';

export default function DocumentsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Array<{ document: DocumentMeta; analysis: DocumentAnalysis }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    try {
      setLoading(true);
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setItems(data.documents || []);
      }
    } catch {
      setNotice('Failed to load documents list.');
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      const chunkSize = 0x8000;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
      }

      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          content: btoa(binary),
          fileType: file.name.split('.').pop() || 'txt',
          mimeType: file.type || undefined,
          sizeBytes: file.size,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload document.');

      setItems((prev) => [data, ...prev]);
      setNotice(`"${file.name}" uploaded successfully.`);
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : 'Upload error.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(id: string, name: string) {
    if (items.length <= 1) {
      setNotice('Cannot remove the only remaining document.');
      return;
    }
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id);
      return;
    }
    // Confirmed — proceed with deletion
    setPendingDeleteId(null);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.document.id !== id));
        setNotice(`"${name}" was deleted.`);
      }
    } catch {
      setNotice('Failed to delete document.');
    }
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rename failed.');

      setItems((prev) =>
        prev.map((i) => (i.document.id === id ? { ...i, document: data.document } : i)),
      );
      setEditingId(null);
      setEditName('');
      setNotice('Document renamed successfully.');
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : 'Rename error.');
    }
  }

  function downloadText(doc: DocumentMeta) {
    const blob = new Blob([doc.extractedText || 'No text extracted'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.filename.replace(/\.[^.]+$/, '') + '-extracted.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = items.filter((item) =>
    item.document.filename.toLowerCase().includes(search.toLowerCase()) ||
    (Boolean(item.analysis?.documentType) && item.analysis.documentType!.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <AppShell onUploadClick={() => fileInputRef.current?.click()}>
      <main id="main-content" tabIndex={-1} className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">LEGAL LENS · DOCUMENT REPOSITORY</p>
            <h1>Documents & Agreements</h1>
          </div>
          <div className="topbar-actions">
            <button onClick={() => fileInputRef.current?.click()} className="primary">
              ↑ Upload Agreement
            </button>
          </div>
        </header>

        {notice && (
          <div className="upload-notice" style={{ marginBottom: '20px' }}>
            <span>{notice}</span>
            <button onClick={() => setNotice('')}>Dismiss</button>
          </div>
        )}

        {/* Portfolio Risk Heatmap & Renewal Overview */}
        {items.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {/* Risk Heatmap Widget */}
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '18px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--amber)', fontFamily: "'Space Mono', monospace" }}>
                  PORTFOLIO RISK HEATMAP
                </span>
                <span style={{ fontSize: '10px', color: 'var(--ink-dim)', fontFamily: "'Space Mono', monospace" }}>
                  {items.length} Agreements
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <div style={{ flex: 1, background: 'var(--rose-bg)', border: '1px solid var(--rose-border)', padding: '8px 12px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--rose)', display: 'block' }}>
                    {items.filter((i) => i.analysis?.scorecard?.overallRisk === 'high').length}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--rose-dim)', fontFamily: "'Space Mono', monospace" }}>High Exposure</span>
                </div>
                <div style={{ flex: 1, background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', padding: '8px 12px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--amber)', display: 'block' }}>
                    {items.filter((i) => i.analysis?.scorecard?.overallRisk === 'medium').length}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--amber-dim)', fontFamily: "'Space Mono', monospace" }}>Moderate Flags</span>
                </div>
                <div style={{ flex: 1, background: 'var(--sage-bg)', border: '1px solid var(--sage-border)', padding: '8px 12px', borderRadius: '6px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--sage)', display: 'block' }}>
                    {items.filter((i) => i.analysis?.scorecard?.overallRisk === 'low').length}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--sage-dim)', fontFamily: "'Space Mono', monospace" }}>Low Risk</span>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--ink-mid)' }}>
                Average Workspace Risk Index: <strong>
                  {Math.round(
                    items.reduce((acc, i) => acc + (i.analysis?.scorecard?.riskScore || 50), 0) / items.length,
                  )}
                  /100
                </strong>
              </p>
            </div>

            {/* Renewal & Deadline Calendar Widget */}
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '18px 22px' }}>
              <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--cyan)', fontFamily: "'Space Mono', monospace", display: 'block', marginBottom: '8px' }}>
                RENEWAL & NOTICE DEADLINES
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '110px', overflowY: 'auto' }}>
                {items.map(({ document: doc, analysis }) => (
                  <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--canvas)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: '4px', fontSize: '11px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                      {doc.filename}
                    </span>
                    <span style={{ color: 'var(--amber)', fontFamily: "'Space Mono', monospace", fontSize: '10px' }}>
                      {analysis?.renewalDate || 'Annual renewal (60d notice)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search and stats bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
          <input
            id="doc-search-input"
            aria-label="Search documents by name or classification"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or classification…"
            style={{ width: '320px' }}
          />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--ink-dim)', letterSpacing: '0.1em' }}>
            TOTAL: {items.length} DOCUMENT{items.length !== 1 ? 'S' : ''}
          </span>
        </div>

        {/* Documents Table / Card List */}
        {loading ? (
          <p style={{ color: 'var(--ink-dim)', fontSize: '13px', fontFamily: "'Space Mono', monospace" }}>Loading workspace documents…</p>
        ) : filtered.length === 0 ? (
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '36px', textAlign: 'center' }}>
            <p style={{ color: 'var(--ink-mid)', fontSize: '13px', margin: '0 0 16px' }}>
              No documents found matching "{search}".
            </p>
            <button className="primary" onClick={() => fileInputRef.current?.click()}>
              Upload Document (.txt, .pdf)
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map(({ document: doc, analysis }) => {
              const isEditing = editingId === doc.id;
              return (
                <div key={doc.id} className="docs-table-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '260px' }}>
                    <span className={doc.fileType === 'pdf' ? 'pdf' : 'txt-badge'}>
                      {doc.fileType.toUpperCase()}
                    </span>
                    <div>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            style={{ width: '220px' }}
                            autoFocus
                          />
                          <button className="primary" style={{ padding: '5px 12px', fontSize: '11px' }} onClick={() => handleRename(doc.id)}>Save</button>
                          <button className="outline-btn" style={{ padding: '5px 10px', fontSize: '11px' }} onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      ) : (
                        <b style={{ fontSize: '13px', color: 'var(--ink)', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>{doc.filename}</b>
                      )}
                      <small style={{ display: 'block', fontFamily: "'Space Mono', monospace", color: 'var(--ink-dim)', fontSize: '10px', marginTop: '4px' }}>
                        {analysis.documentType || 'Commercial Contract'} · {doc.pageCount || 1} pp · {(doc.sizeBytes / 1024).toFixed(0)} KB · {new Date(doc.uploadedAt).toLocaleDateString()}
                      </small>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className={doc.extractionStatus === 'complete' ? 'ready' : 'status-tag-demo'}>
                      {doc.extractionStatus === 'complete' ? '● READY' : '○ DEMO'}
                    </span>
                    <Link href={`/?doc=${doc.id}`} className="outline-btn" style={{ textDecoration: 'none' }}>Open</Link>
                    <Link href={`/compare?base=${doc.id}`} className="outline-btn" style={{ textDecoration: 'none' }}>Compare</Link>
                    <button className="outline-btn" onClick={() => { setEditingId(doc.id); setEditName(doc.filename); }}>Rename</button>
                    <button className="outline-btn" onClick={() => downloadText(doc)}>Download</button>
                    {pendingDeleteId === doc.id ? (
                      <>
                        <button
                          style={{ color: 'var(--rose)', border: '1px solid var(--rose-border)', background: 'var(--rose-bg)', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: "'Space Mono', monospace" }}
                          onClick={() => handleDelete(doc.id, doc.filename)}
                        >
                          Confirm Delete
                        </button>
                        <button className="outline-btn" style={{ fontSize: '11px' }} onClick={() => setPendingDeleteId(null)}>Cancel</button>
                      </>
                    ) : (
                      <button className="outline-btn" onClick={() => handleDelete(doc.id, doc.filename)} style={{ color: 'var(--rose)' }}>Delete</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <input
          ref={fileInputRef}
          className="hidden"
          type="file"
          accept=".txt,.pdf,.doc,.docx"
          onChange={handleFileUpload}
        />
      </main>
    </AppShell>
  );
}
