import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface AppShellProps {
  children: React.ReactNode;
  onUploadClick?: () => void;
  uploading?: boolean;
}

export default function AppShell({ children, onUploadClick, uploading }: AppShellProps) {
  const router = useRouter();
  const currentPath = router.pathname;

  const navItems = [
    { href: '/', label: 'Workspace', fullLabel: 'Workspace', icon: '▦' },
    { href: '/documents', label: 'Docs', fullLabel: 'Agreements', icon: '▤' },
    { href: '/compare', label: 'Compare', fullLabel: 'Redline Compare', icon: '⟷' },
    { href: '/saved-questions', label: 'Research', fullLabel: 'Saved Research', icon: '♡' },
    { href: '/help', label: 'Methodology', fullLabel: 'AI & Methodology', icon: '?' },
  ];

  return (
    <div className="app-shell">
      {/* Accessibility Skip Link */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Mobile Top App Bar */}
      <header className="mobile-header" role="banner">
        <Link href="/" className="mobile-brand" aria-label="Legal Lens Home">
          <span className="brand-mark" aria-hidden="true">⚖</span>
          <div className="brand-text">
            <span className="brand-title">LEGAL<span>LENS</span></span>
            <span className="brand-tagline">GenAI LEGAL ASSISTANCE</span>
          </div>
        </Link>

        <div className="mobile-header-actions">
          {onUploadClick && (
            <button
              onClick={onUploadClick}
              disabled={uploading}
              className="mobile-upload-btn"
              aria-label="Upload legal document for analysis"
            >
              {uploading ? '…' : '↑ Add'}
            </button>
          )}
          <span className="avatar avatar-sm" title="Active Legal Analyst" aria-label="Active Legal Analyst Profile">
            LR
          </span>
        </div>
      </header>

      {/* Desktop Navigation Sidebar */}
      <aside className="sidebar desktop-only" aria-label="Primary Navigation">
        <Link href="/" style={{ textDecoration: 'none' }} aria-label="Legal Lens Workspace Home">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">⚖</span>
            <div className="brand-text">
              <span className="brand-title">LEGAL<span>LENS</span></span>
              <span className="brand-tagline">GenAI LEGAL ASSISTANCE</span>
            </div>
          </div>
        </Link>

        <p className="sidebar-label" id="workspace-nav-heading">WORKSPACE</p>
        <nav role="navigation" aria-labelledby="workspace-nav-heading">
          {navItems.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="nav-item-icon" aria-hidden="true">{item.icon}</span>
                <span>{item.fullLabel || item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="privacy-note" role="status" aria-live="polite">
            <span className="status-dot green" aria-hidden="true"></span>
            <div>
              <p className="privacy-title">Gemini GenAI Active</p>
              <p className="privacy-sub">Google Gemini 1.5 Flash</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Accessible Content Region */}
      <div className="content-area">
        {children}
      </div>
    </div>
  );
}
