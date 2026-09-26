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
    { href: '/help', label: 'Methodology', fullLabel: 'Trust & Engine', icon: '?' },
  ];

  return (
    <div className="app-shell">
      {/* Mobile Top App Bar */}
      <header className="mobile-header">
        <Link href="/" className="mobile-brand">
          <span className="brand-mark">⚖</span>
          <div className="brand-text">
            <span className="brand-title">LEGAL<span>LENS</span></span>
            <span className="brand-tagline">AIR-GAPPED WORKSPACE</span>
          </div>
        </Link>

        <div className="mobile-header-actions">
          {onUploadClick && (
            <button
              onClick={onUploadClick}
              disabled={uploading}
              className="mobile-upload-btn"
              aria-label="Upload document"
            >
              {uploading ? '…' : '↑ Add'}
            </button>
          )}
          <span className="avatar avatar-sm" title="Active Legal Analyst">LR</span>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="sidebar desktop-only">
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div className="brand">
            <span className="brand-mark">⚖</span>
            <div className="brand-text">
              <span className="brand-title">LEGAL<span>LENS</span></span>
              <span className="brand-tagline">CONTRACT INTELLIGENCE</span>
            </div>
          </div>
        </Link>

        <p className="sidebar-label">WORKSPACE</p>
        <nav>
          {navItems.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-item-icon">{item.icon}</span>
                <span>{item.fullLabel || item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="privacy-note">
            <span className="privacy-pulse" />
            <div className="privacy-text">
              <strong>Private &amp; Air-Gapped</strong>
              <small>Zero third-party telemetry</small>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="shell-content">{children}</div>

      {/* Mobile Bottom Floating Dock (Fitts' Law thumb zone) */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        {navItems.map((item) => {
          const isActive = currentPath === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-nav-tab ${isActive ? 'active' : ''}`}
            >
              <span className="mobile-nav-icon">{item.icon}</span>
              <span className="mobile-nav-label">{item.label}</span>
              {isActive && <span className="mobile-nav-indicator" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
