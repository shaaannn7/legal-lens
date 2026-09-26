import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';

interface SavedQ {
  id: string;
  docTitle: string;
  question: string;
  answer: string;
  source: string;
  savedAt: string;
}

const SEED_QUESTIONS: SavedQ[] = [
  {
    id: 'sq_seed_1',
    docTitle: 'Vendor Services Agreement.pdf',
    question: 'When can either party terminate?',
    answer:
      'Either party may terminate this agreement with ninety (90) days written notice for convenience, or 30 days for uncured material breach.',
    source: 'Section 8 · Termination',
    savedAt: '2026-09-20',
  },
  {
    id: 'sq_seed_2',
    docTitle: 'Vendor Services Agreement.pdf',
    question: 'What is the liability cap for data breaches?',
    answer:
      'General liabilities are capped at 12 months of fees paid, but liability arising from breaches of Confidentiality or Data Protection remains uncapped.',
    source: 'Section 11 · Limitation of Liability',
    savedAt: '2026-09-20',
  },
  {
    id: 'sq_seed_3',
    docTitle: 'Vendor Services Agreement.pdf',
    question: 'What can I negotiate before signing?',
    answer:
      'Top negotiable priorities include: 1) Shortening the 90-day notice period to 30 or 60 days; 2) Adding an aggregate monetary super-cap for data breach liabilities; 3) Requiring a 30-day written notice before auto-renewal lock-in.',
    source: 'Section 3, Section 8, Section 11',
    savedAt: '2026-09-20',
  },
];

const LS_KEY = 'legallens_saved_qa';

function loadFromLocalStorage(): SavedQ[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

export default function SavedQuestionsPage() {
  const [questions, setQuestions] = useState<SavedQ[]>(SEED_QUESTIONS);
  const [loaded, setLoaded] = useState(false);

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    const persisted = loadFromLocalStorage();
    // Merge: persisted entries first, then seed items not yet present
    const persistedIds = new Set(persisted.map((q) => q.id));
    const merged = [...persisted, ...SEED_QUESTIONS.filter((q) => !persistedIds.has(q.id))];
    setQuestions(merged);
    setLoaded(true);
  }, []);

  function removeQuestion(id: string) {
    setQuestions((prev) => {
      const updated = prev.filter((q) => q.id !== id);
      // Persist only non-seed items to localStorage
      const toStore = updated.filter((q) => !q.id.startsWith('sq_seed_'));
      localStorage.setItem(LS_KEY, JSON.stringify(toStore));
      return updated;
    });
  }

  function clearAll() {
    localStorage.removeItem(LS_KEY);
    setQuestions(SEED_QUESTIONS);
  }

  const hasSaved = questions.some((q) => !q.id.startsWith('sq_seed_'));

  return (
    <AppShell>
      <main id="main-content" tabIndex={-1} className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">LEGAL LENS · KNOWLEDGE REPOSITORY</p>
            <h1>Saved Inquiries &amp; Research</h1>
          </div>
          <div className="topbar-actions">
            <Link href="/" className="primary" style={{ textDecoration: 'none' }}>
              Ask Your Document →
            </Link>
          </div>
        </header>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <p style={{ color: 'var(--ink-mid)', fontSize: '13px', margin: 0 }}>
            {loaded
              ? `${questions.length} saved ${questions.length === 1 ? 'question' : 'questions'} — grounded in your uploaded agreements.`
              : 'Loading saved questions…'}
          </p>
          {hasSaved && (
            <button
              onClick={clearAll}
              style={{ fontSize: '11px', color: 'var(--rose)', background: 'none', border: 0, cursor: 'pointer', fontFamily: "'Space Mono', monospace" }}
            >
              Clear saved
            </button>
          )}
        </div>

        {questions.length === 0 ? (
          <div
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              padding: '36px',
              textAlign: 'center',
            }}
          >
            <p style={{ color: 'var(--ink-mid)', margin: '0 0 16px', fontSize: '13px' }}>No saved questions yet.</p>
            <Link href="/" className="primary" style={{ textDecoration: 'none' }}>
              Open Workspace to Ask Questions
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {questions.map((q) => {
              const isSeed = q.id.startsWith('sq_seed_');
              return (
                <article
                  key={q.id}
                  style={{
                    background: 'var(--panel)',
                    border: '1px solid var(--border)',
                    borderLeft: isSeed ? '3px solid var(--border-mid)' : '3px solid var(--amber)',
                    borderRadius: 'var(--r-md)',
                    padding: '16px 20px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--amber)', fontWeight: 600 }}>
                      {q.docTitle} · {q.source}
                      {isSeed && <span style={{ marginLeft: '6px', color: 'var(--ink-dim)' }}>· example</span>}
                    </span>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: 'var(--ink-dim)' }}>{q.savedAt}</span>
                      <button
                        onClick={() => removeQuestion(q.id)}
                        style={{
                          background: 'none',
                          border: 0,
                          color: 'var(--rose)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          minHeight: '30px',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <h3
                    style={{
                      fontSize: '14px',
                      margin: '0 0 10px',
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 600,
                      color: 'var(--ink)',
                    }}
                  >
                    {q.question}
                  </h3>
                  <div
                    style={{
                      background: 'var(--cyan-bg)',
                      border: '1px solid var(--cyan-border)',
                      padding: '12px 14px',
                      borderRadius: 'var(--r-sm)',
                      fontSize: '12px',
                      lineHeight: '1.55',
                      color: 'var(--ink)',
                      fontFamily: "'Space Mono', monospace",
                    }}
                  >
                    {q.answer}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </AppShell>
  );
}
