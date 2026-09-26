# ⚖ Legal Lens — Contract Intelligence Workstation

> **Air-gapped, deterministic contract analysis. Zero telemetry. No external LLM calls.**

Legal Lens is a privacy-first contract intelligence platform that transforms dense legal agreements into clear, grounded, and actionable intelligence — entirely on your own infrastructure.

---

## ✨ Features

### 🔍 Contract Analysis Engine
- **Document Type Detection** — Automatically classifies MSAs, NDAs, EULAs, SOWs, Employment Agreements, and Commercial Leases
- **Party & Jurisdiction Extraction** — Identifies contracting parties and governing law from free-text clauses
- **Expanded Clause Taxonomy** — Extracts 8+ risk categories: termination, liability, IP, indemnification, warranties, assignment, data privacy, and payment terms
- **Dynamic Risk Scorecard** — Weighted 0–100 risk index with critical/moderate/low breakdown
- **Negotiation Checklist** — Auto-generates prioritized negotiation levers with suggested replacement language
- **Missing Protections Detector** — Flags absent industry-standard clauses (breach notice SLAs, force majeure, audit rights)

### 📖 Interactive Document Reader
- **Clause Risk Overlays** — Color-coded left borders (red/amber/green) map each section to its risk tier
- **Section Jump Navigation** — Click any clause insight card to instantly scroll & highlight the source text
- **In-Reader Search** — Full-text search with highlighted match terms across all document sections
- **Private Clause Annotations** — Add reviewer notes to individual sections, persisted in localStorage
- **Copy Clause** — One-click copy of any clause block to clipboard

### ⟷ Redline Comparison
- **Section-Level Diff Engine** — Matches sections by number and title between any two uploaded agreements
- **Impact Categorization** — Classifies every delta as Favorable / Unfavorable / Neutral
- **Side-by-Side & Inline Redline Modes** — Toggle between parallel panels and inline strikethrough/insertion display
- **Severity-Based Filtering** — Filter differences by type (added/removed/modified) and impact
- **Export** — Download comparison reports as Markdown or CSV

### 🧠 Grounded Q&A Engine
- **Legal Synonym Expansion** — Queries for "cancel" → "terminate", "pay" → "fees/invoice", "court" → "jurisdiction"
- **Confidence Tiers** — Answers labeled GROUNDED IN TEXT, SYNTHESIZED, or NOT FOUND
- **Source Citation** — Every answer links to the exact clause with line coordinates
- **Saved Research Repository** — Save Q&A sessions to localStorage for later review

### 📊 Portfolio Intelligence (Documents page)
- **Risk Heatmap** — Visualizes high/medium/low risk distribution across all uploaded agreements
- **Renewal Calendar** — Tracks auto-renewal notice windows for every document in the workspace

### 📋 Actionable Outputs (all downloadable as .md)
- One-Page Executive Summary
- Questions for Legal Counsel
- Pre-Signature Negotiation Checklist
- Obligations & Milestones Timeline
- Pre-Signing Checklist
- Key Dates & Renewal Calendar

---

## 🏗 Architecture

```
legal-lens/
├── pages/
│   ├── index.tsx              # Main workspace: analysis + reader split view
│   ├── compare.tsx            # Redline comparison workbench
│   ├── documents.tsx          # Agreement portfolio + risk heatmap
│   ├── saved-questions.tsx    # Q&A research repository
│   ├── help.tsx               # Methodology & trust transparency
│   └── api/
│       ├── documents/         # CRUD for document store
│       ├── analyze.ts         # Grounded Q&A API endpoint
│       └── compare.ts         # Comparison diff API endpoint
├── src/
│   ├── components/
│   │   └── AppShell.tsx       # Sidebar + mobile navigation shell
│   ├── services/
│   │   ├── analyzer.ts        # Core clause extraction & risk scoring
│   │   ├── comparator.ts      # Section-level diff engine
│   │   ├── qaEngine.ts        # Grounded Q&A with synonym expansion
│   │   ├── documentParser.ts  # PDF/DOCX/TXT text extraction
│   │   ├── documentStore.ts   # In-memory + file-based persistence
│   │   └── exports.ts         # Markdown/CSV export builders
│   ├── styles/
│   │   └── globals.css        # Obsidian & Burnished Aurum design system
│   └── types/
│       └── index.ts           # Full TypeScript type definitions
└── data/                      # Local document storage (gitignored)
```

### Privacy Architecture
- **Zero External LLM Calls** — All analysis is deterministic regex and pattern-matching
- **Local File Persistence** — Documents stored as JSON in /data/ on your server
- **No Telemetry** — No analytics, tracking scripts, or third-party data transfers
- **Air-Gapped Compatible** — Works completely offline after initial install

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Installation
```bash
git clone https://github.com/your-org/legal-lens.git
cd legal-lens
npm install
```

### Development
```bash
npm run dev
```
Open http://localhost:3000

### Production Build
```bash
npm run build
npm start
```

### Docker
```bash
docker build -t legal-lens .
docker run -p 3000:3000 -v $(pwd)/data:/app/data legal-lens
```

---

## 📄 Supported File Formats

| Format | Text Extraction | Analysis |
|--------|----------------|---------|
| .txt   | Full           | Complete |
| .pdf   | Via pdfjs-dist | Complete |
| .docx  | Via mammoth    | Complete |
| .doc   | Demo mode      | Limited  |

---

## 🧪 Testing
```bash
npm test
```

---

## ⚖ Legal Notice

Legal Lens provides informational analysis for comprehension and decision support only — not legal advice. For decisions affecting rights, liabilities, or binding obligations, consult a qualified legal professional.

---

## 📝 License

MIT License
