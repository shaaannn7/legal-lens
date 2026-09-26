<div align="center">
  <img src="./public/banner.jpg" alt="Legal Lens — Contract Intelligence Workstation" width="100%" />

  <br/>
  <br/>

  [![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
  [![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
  [![Google Gemini AI](https://img.shields.io/badge/Google%20Gemini-1.5%20Flash-4285F4?style=flat-square&logo=google)](https://ai.google.dev)
  [![License: MIT](https://img.shields.io/badge/License-MIT-F5B63C?style=flat-square)](./LICENSE)
  [![Build](https://img.shields.io/badge/Build-Passing-22c55e?style=flat-square)](#-quick-start)

  <h3>Turn dense legal agreements into clear, grounded, and actionable intelligence.</h3>
  <p><strong>Google Gemini AI · Hybrid Deterministic & LLM Engine · Rate-Limited Security · High-Efficiency Caching</strong></p>

  [Features](#-features) · [Architecture](#-architecture) · [Quick Start](#-quick-start) · [Tech Stack](#-tech-stack) · [Security & Privacy](#-security--privacy-architecture) · [License](#-license)
</div>

---

## What Is Legal Lens?

Legal Lens is an **AI-powered contract intelligence workstation** built for legal teams, founders, and operators. Powered by **Google Gemini 1.5 Flash** paired with a deterministic fallback engine, Legal Lens turns dense, multi-page legal agreements into clear executive summaries, risk scorecards, negotiation checklists, and conversational legal Q&A.

---

## ✨ Features

### 🤖 Google Gemini GenAI Integration
- **LLM Contract Analysis** — Leverages Google Gemini 1.5 Flash for deep semantic contract understanding, plain-English translations, and legal risk classification.
- **Grounded Legal Q&A** — Interactive conversational assistant that answers complex legal questions with exact section citations, line numbers, and text excerpts.
- **Hybrid Resilient Engine** — Operates seamlessly with Google Gemini when `GEMINI_API_KEY` is present, with instant automatic fallback to local deterministic regex analysis.

### 🛡️ Enterprise Security & Hardening
- **API Rate Limiting** — In-memory rate limiter per IP address to prevent brute-force attacks and service degradation.
- **Prompt Injection Defense** — Automatic sanitizer that neutralizes prompt manipulation vectors (`ignore instructions`, system overrides).
- **XSS & Input Sanitization** — HTML tag stripping and input validation across document uploads and API queries.
- **HTTP Security Headers** — Configured with HSTS, Content-Type-Options (nosniff), Frame-Options (DENY), XSS-Protection, and Referrer-Policy.

### ⚡ High-Efficiency Architecture
- **In-Memory LRU Cache** — Caches analysis results and AI Q&A responses for 0ms response latency on repeated queries.
- **Optimized Bundle** — Component memoization (`useMemo`, `useCallback`) to eliminate unnecessary re-renders.

### 🔍 Forensic Contract Analysis
- **Document Type Classification** — Auto-detects MSAs, NDAs, EULAs, SOWs, Employment Agreements, SaaS Subscriptions, and Commercial Leases.
- **Party & Jurisdiction Extraction** — Identifies contracting parties and governing law from natural text.
- **10+ Clause Taxonomies** — Covers termination, liability, indemnification, IP ownership, non-compete, warranties, data privacy (DPA), and payment terms.
- **Weighted Risk Scorecard** — 0–100 risk index with critical / moderate / low breakdown.
- **Negotiation Checklist** — Prioritized levers with suggested counter-proposal replacement language.
- **Missing Protections Detector** — Flags absent industry-standard clauses (force majeure, audit rights, breach notice SLAs).

### 📖 Interactive Document Reader
- **Clause Risk Overlays** — Color-coded left borders (🔴 high / 🟡 medium / 🟢 low) on every section.
- **Section Jump Navigation** — Click any insight card to instantly scroll & highlight its source clause.
- **In-Reader Full-Text Search** — Highlighted match terms across all document sections.
- **Private Clause Annotations** — Add reviewer notes to any section, persisted in localStorage.

### ⟷ Redline Comparison
- **Section-Level Diff Engine** — Matches clauses by number and title between any two uploaded drafts.
- **Visual Diff Highlighting** — Clear visual markers for Added, Removed, and Modified provisions.

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env.local` to configure environment variables:

```bash
# Optional: Google Gemini API Key for LLM-powered Gen AI contract analysis & Q&A
GEMINI_API_KEY=your_google_gemini_api_key_here

# Optional: Model name (defaults to gemini-1.5-flash)
GEMINI_MODEL=gemini-1.5-flash
```

---

## 🧪 Testing & Verification

```bash
# Run full unit test suite (including Security, Cache, and Gemini AI tests)
npm test

# Run TypeScript typecheck
npm run typecheck

# Production build
npm run build
```

---

## ⚖️ Legal Disclaimer

Legal Lens provides automated legal information and comprehension support, not formal legal advice. For binding contracts or high-risk decisions, consult a qualified attorney.
