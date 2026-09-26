import { DocumentMeta } from '../types';
import fs from 'fs';
import path from 'path';

const globalForDocs = globalThis as unknown as {
  __legalLensDocStore?: Map<string, DocumentMeta>;
};

const INITIAL_VENDOR_PDF_TEXT = `MASTER VENDOR SERVICES AGREEMENT

This Master Vendor Services Agreement ("Agreement") is entered into as of January 15, 2026 ("Effective Date"), by and between Acme Cloud Solutions LLC, a Delaware limited liability company ("Provider"), and Meridian Logistics Corp, a California corporation ("Customer").

1. SERVICES AND STATEMENTS OF WORK
Provider shall provide Customer with the managed cloud infrastructure, analytics monitoring, and related technical support services described in each mutually executed Statement of Work ("SOW").

2. FEES AND PAYMENT TERMS
Customer shall pay all undisputed fees set forth in each SOW within thirty (30) days from the invoice date ("Net 30"). Any amounts not paid when due shall accrue interest at the rate of 1.5% per month or the maximum rate permitted by law.

3. TERM AND RENEWAL
This Agreement commences on the Effective Date and continues for an initial period of twelve (12) months ("Initial Term"). Thereafter, this Agreement shall automatically renew for successive twelve (12) month terms unless either party provides written notice of non-renewal at least sixty (60) days prior to the expiration of the then-current term.

4. SERVICE LEVELS AND SUPPORT
Provider warrants that the platform services will maintain 99.9% availability during each calendar month, excluding scheduled maintenance windows announced at least 48 hours in advance.

5. INTELLECTUAL PROPERTY RIGHTS
Customer shall own all rights, title, and interest in Work Product upon receipt of full payment. Provider retains ownership of all Pre-Existing Materials and general system architecture.

6. CONFIDENTIALITY
Each party agrees to safeguard the Confidential Information of the other party with the same degree of care it uses for its own confidential information, but in no event less than a reasonable degree of care. These confidentiality obligations survive for a period of three (3) years following expiration or termination.

7. DATA SECURITY AND COMPLIANCE
Provider shall maintain administrative, physical, and technical safeguards designed to protect the security, confidentiality, and integrity of Customer Data in compliance with SOC 2 Type II standards.

8. TERMINATION
Either party may terminate this agreement with ninety (90) days written notice for convenience. Either party may terminate immediately upon written notice if the other party materially breaches this Agreement and fails to cure such breach within thirty (30) days.

9. LIMITATION OF LIABILITY
Except for breaches of Section 6 (Confidentiality) or willful misconduct, in no event shall either party's aggregate liability exceed the total fees paid or payable by Customer in the twelve (12) months preceding the claim. Liability arising from breaches of Confidentiality or Data Protection shall remain uncapped.

10. NON-SOLICITATION
Neither party shall solicit or recruit employees or contractors of the other party during the term and for 12 months thereafter.

11. GOVERNING LAW AND JURISDICTION
This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law principles. Any legal suit or action arising out of this Agreement shall be instituted in the federal or state courts situated in New Castle County, Delaware.
`;

const INITIAL_REVISED_DRAFT_TEXT = `MASTER VENDOR SERVICES AGREEMENT (REVISED DRAFT)

This Master Vendor Services Agreement ("Agreement") is entered into as of January 15, 2026 ("Effective Date"), by and between Acme Cloud Solutions LLC, a Delaware limited liability company ("Provider"), and Meridian Logistics Corp, a California corporation ("Customer").

1. SERVICES AND STATEMENTS OF WORK
Provider shall provide Customer with the managed cloud infrastructure, analytics monitoring, and related technical support services described in each mutually executed Statement of Work ("SOW").

2. FEES AND PAYMENT TERMS
Customer shall pay all undisputed fees set forth in each SOW within thirty (30) days from the invoice date ("Net 30").

3. TERM AND RENEWAL
This Agreement commences on the Effective Date and continues for an initial period of twelve (12) months ("Initial Term"). Thereafter, this Agreement shall automatically renew for successive twelve (12) month terms unless either party provides written notice of non-renewal at least thirty (30) days prior to the expiration of the then-current term.

4. SERVICE LEVELS AND SERVICE CREDITS
Provider warrants that the platform services will maintain 99.9% availability during each calendar month. Failure to meet the 99.9% monthly availability target shall entitle Customer to a 5% credit on the monthly service fee for each 1% below SLA.

5. INTELLECTUAL PROPERTY AND INDEMNIFICATION
Customer owns all custom deliverables upon payment. Provider shall defend, indemnify, and hold harmless Customer against claims alleging Work Product infringes any third-party patent or copyright.

6. CONFIDENTIALITY
Mutual confidentiality obligations surviving for three (3) years.

7. DATA SECURITY AND COMPLIANCE
Provider maintains SOC 2 Type II compliance and ISO 27001 certifications.

8. TERMINATION
Either party may terminate this agreement upon thirty (30) days prior written notice for convenience, or 30 days for uncured material breach.

9. LIMITATION OF LIABILITY AND SUPER-CAP
In no event shall either party's ordinary liability exceed fees paid in the prior 12 months. Liability arising from Data Protection breaches shall be subject to an aggregate super-cap of $2,000,000.

10. GOVERNING LAW AND JURISDICTION
Governed by the laws of the State of Delaware.
`;

function getSeedDocuments(): Map<string, DocumentMeta> {
  const map = new Map<string, DocumentMeta>();

  const doc1: DocumentMeta = {
    id: 'doc_vendor_services_pdf',
    filename: 'Vendor Services Agreement.pdf',
    fileType: 'pdf',
    sizeBytes: 124500,
    uploadedAt: '2026-09-20T10:00:00.000Z',
    extractedText: INITIAL_VENDOR_PDF_TEXT,
    pageCount: 12,
    extractionStatus: 'complete',
  };

  const doc2: DocumentMeta = {
    id: 'doc_vendor_revised_draft',
    filename: 'Vendor Services Agreement (Revised Draft).txt',
    fileType: 'txt',
    sizeBytes: 4230,
    uploadedAt: '2026-09-20T11:30:00.000Z',
    extractedText: INITIAL_REVISED_DRAFT_TEXT,
    pageCount: 4,
    extractionStatus: 'complete',
  };

  map.set(doc1.id, doc1);
  map.set(doc2.id, doc2);
  return map;
}

// File persistence path
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'documents.json');

function saveToDisk(store: Map<string, DocumentMeta>): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempFile = `${DATA_FILE}.tmp`;
  const array = Array.from(store.values());
  fs.writeFileSync(tempFile, JSON.stringify(array, null, 2), 'utf-8');
  fs.renameSync(tempFile, DATA_FILE);
}

function loadFromDisk(): Map<string, DocumentMeta> | null {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const map = new Map<string, DocumentMeta>();
        for (const item of parsed) {
          if (item && item.id) map.set(item.id, item);
        }
        return map;
      }
    }
  } catch (error) {
    console.error('Legal Lens document store could not load persisted data:', error);
  }
  return null;
}

function getStore(): Map<string, DocumentMeta> {
  if (!globalForDocs.__legalLensDocStore) {
    const loaded = loadFromDisk();
    globalForDocs.__legalLensDocStore = loaded || getSeedDocuments();
    if (!loaded) {
      saveToDisk(globalForDocs.__legalLensDocStore);
    }
  }
  return globalForDocs.__legalLensDocStore;
}

export function getAllDocuments(): DocumentMeta[] {
  return Array.from(getStore().values());
}

export function getDocumentById(id: string): DocumentMeta | undefined {
  return getStore().get(id);
}

export function addDocument(doc: DocumentMeta): DocumentMeta {
  const store = getStore();
  store.set(doc.id, doc);
  saveToDisk(store);
  return doc;
}

export function renameDocument(id: string, newFilename: string): DocumentMeta | undefined {
  const store = getStore();
  const doc = store.get(id);
  if (!doc) return undefined;
  doc.filename = newFilename.trim();
  saveToDisk(store);
  return doc;
}

export function deleteDocument(id: string): boolean {
  const store = getStore();
  const deleted = store.delete(id);
  if (deleted) {
    saveToDisk(store);
  }
  return deleted;
}

export function resetStore(): void {
  globalForDocs.__legalLensDocStore = getSeedDocuments();
  saveToDisk(globalForDocs.__legalLensDocStore);
}
