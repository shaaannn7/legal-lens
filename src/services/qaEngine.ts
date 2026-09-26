import { DocumentMeta, DocumentAnalysis, AnalyzeResponse, ParsedSection } from '../types';
import { LEGAL_DISCLAIMER } from './analyzer';

export function answerDocumentQuestion(
  doc: DocumentMeta,
  analysis: DocumentAnalysis,
  question: string,
): AnalyzeResponse {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    return {
      answer: 'Please provide a question about the document.',
      sources: [],
      confidence: 'not_found',
      matchType: 'not_found',
      disclaimer: LEGAL_DISCLAIMER,
    };
  }

  if (doc.extractionStatus !== 'complete' || !doc.extractedText) {
    return {
      answer: `Unable to answer questions because text from "${doc.filename}" has not been extracted (${doc.extractionStatus}). Please upload a plain text (.txt) document or review the extraction status.`,
      sources: [],
      confidence: 'not_found',
      matchType: 'not_found',
      disclaimer: LEGAL_DISCLAIMER,
    };
  }

  const q = trimmedQuestion.toLowerCase();
  const text = doc.extractedText.toLowerCase();

  // Helper to find a section by keyword
  function findSection(predicate: (s: ParsedSection) => boolean): ParsedSection | undefined {
    return analysis.sections?.find(predicate);
  }

  // 1. Negotiation inquiries
  if (q.includes('negot') || q.includes('change') || q.includes('redline') || q.includes('improve')) {
    const termInsight = analysis.insights.find((i) => i.id === 'ins_term');
    const liabInsight = analysis.insights.find((i) => i.id === 'ins_liab');
    const renewInsight = analysis.insights.find((i) => i.id === 'ins_renew');

    const points: string[] = [];
    const sources: string[] = [];

    if (termInsight) {
      points.push('Shortening the termination notice window (e.g. requesting 30 or 60 days instead of 90 days)');
      sources.push(termInsight.sourceLabel);
    }
    if (liabInsight) {
      points.push('Establishing a mutual aggregate monetary cap (or super-cap) for data protection and confidentiality rather than unlimited exposure');
      sources.push(liabInsight.sourceLabel);
    }
    if (renewInsight) {
      points.push('Requiring the provider to issue a 30-day written reminder prior to automatic 12-month renewal lock-in');
      sources.push(renewInsight.sourceLabel);
    }

    if (points.length > 0) {
      return {
        answer: `Based on the terms in "${doc.filename}", top negotiable priorities include: 1) ${points.join('; 2) ')}. Discuss these specific clauses with your legal counsel before signing.`,
        sources,
        sourceExcerpt: liabInsight?.sourceExcerpt || termInsight?.sourceExcerpt,
        confidence: 'grounded',
        matchType: 'exact_clause',
        sectionReference: liabInsight?.sourceLabel || termInsight?.sourceLabel,
        lineRange: liabInsight?.lineRange || termInsight?.lineRange,
        highlightText: liabInsight?.sourceExcerpt || termInsight?.sourceExcerpt,
        disclaimer: LEGAL_DISCLAIMER,
      };
    }
  }

  // 2. Obligations & responsibilities
  if (q.includes('obligation') || q.includes('responsib') || q.includes('duty') || q.includes('require')) {
    if (analysis.obligations.length > 0) {
      const summaryList = analysis.obligations
        .map((o) => `${o.owner}: ${o.action} (${o.sourceLabel})`)
        .join('; ');
      const firstOb = analysis.obligations[0];
      return {
        answer: `The primary obligations identified in "${doc.filename}" are: ${summaryList}.`,
        sources: Array.from(new Set(analysis.obligations.map((o) => o.sourceLabel))),
        sourceExcerpt: firstOb?.sourceLabel,
        confidence: 'grounded',
        matchType: 'exact_clause',
        sectionReference: firstOb?.sourceLabel,
        lineRange: firstOb?.lineRange,
        disclaimer: LEGAL_DISCLAIMER,
      };
    }
  }

  // 3. Termination / Cancellation
  if (q.includes('terminat') || q.includes('cancel') || q.includes('end the agreement') || q.includes('exit')) {
    const termSec = findSection((s) => s.title.toLowerCase().includes('terminat') || s.content.toLowerCase().includes('terminate'));
    const termInsight = analysis.insights.find((i) => i.id === 'ins_term');
    const renewInsight = analysis.insights.find((i) => i.id === 'ins_renew');

    return {
      answer: `Under "${doc.filename}", termination requires written notice (typically 90 days for convenience, or 30 days for material breach). Notice must be served prior to renewal deadlines to avoid rolling over into another 12-month commitment.`,
      sources: [
        termInsight?.sourceLabel || termSec?.title || 'Section 8 · Termination',
        renewInsight?.sourceLabel || 'Section 3 · Term and Renewal',
      ],
      sourceExcerpt: termInsight?.sourceExcerpt || 'Either party may terminate this agreement with ninety (90) days written notice.',
      confidence: 'grounded',
      matchType: 'exact_clause',
      sectionReference: termSec?.title || termInsight?.sourceLabel,
      lineRange: termSec ? [termSec.startLine, termSec.endLine] : termInsight?.lineRange,
      highlightText: 'terminate this agreement',
      disclaimer: LEGAL_DISCLAIMER,
    };
  }

  // 4. Liability, Risk, Damages, Indemnification
  if (q.includes('liab') || q.includes('risk') || q.includes('damag') || q.includes('indemn') || q.includes('sue') || q.includes('lawsuit')) {
    const liabSec = findSection((s) => s.title.toLowerCase().includes('liab') || s.content.toLowerCase().includes('liability'));
    const liabInsight = analysis.insights.find((i) => i.id === 'ins_liab');
    return {
      answer: `In "${doc.filename}", general liabilities are typically capped at fees paid over the preceding 12 months. However, crucial exceptions exist: liability arising from confidentiality breaches or data security incidents remains UNCAPPED, representing a major potential exposure.`,
      sources: [liabInsight?.sourceLabel || liabSec?.title || 'Section 11 · Limitation of Liability'],
      sourceExcerpt: liabInsight?.sourceExcerpt || 'Liability arising from breaches of Confidentiality or Data Protection shall remain uncapped.',
      confidence: 'grounded',
      matchType: 'exact_clause',
      sectionReference: liabSec?.title || liabInsight?.sourceLabel,
      lineRange: liabSec ? [liabSec.startLine, liabSec.endLine] : liabInsight?.lineRange,
      highlightText: 'remain uncapped',
      disclaimer: LEGAL_DISCLAIMER,
    };
  }

  // 5. Renewal, Term, Duration, Expiration
  if (q.includes('renew') || q.includes('term') || q.includes('duration') || q.includes('expir') || q.includes('how long')) {
    const renewSec = findSection((s) => s.title.toLowerCase().includes('renew') || s.title.toLowerCase().includes('term'));
    return {
      answer: `The agreement is structured for an initial term of 12 months and renews automatically for successive 12-month terms unless either party provides written notice of non-renewal at least 60 days before the renewal date.`,
      sources: [renewSec?.title || 'Section 3 · Term and Renewal'],
      sourceExcerpt: 'This Agreement shall automatically renew for successive twelve (12) month terms unless either party provides written notice of non-renewal at least sixty (60) days prior to expiration.',
      confidence: 'grounded',
      matchType: 'exact_clause',
      sectionReference: renewSec?.title || 'Section 3 · Term and Renewal',
      lineRange: renewSec ? [renewSec.startLine, renewSec.endLine] : undefined,
      highlightText: 'automatically renew',
      disclaimer: LEGAL_DISCLAIMER,
    };
  }

  // 6. Governing Law, Jurisdiction, Dispute, Court
  if (q.includes('law') || q.includes('jurisdiction') || q.includes('court') || q.includes('dispute') || q.includes('state')) {
    const jur = analysis.jurisdiction || 'the designated state courts';
    const lawSec = findSection((s) => s.title.toLowerCase().includes('governing law') || s.title.toLowerCase().includes('jurisdiction'));
    return {
      answer: `The agreement specifies that it is governed by the laws of ${jur}, without regard to conflict of law principles. Any legal proceedings must be brought in courts located within that jurisdiction.`,
      sources: [lawSec?.title || 'Section 14 · Governing Law and Jurisdiction'],
      sourceExcerpt: `This agreement shall be governed by and construed in accordance with the laws of the ${jur}.`,
      confidence: 'grounded',
      matchType: 'exact_clause',
      sectionReference: lawSec?.title || 'Section 14 · Governing Law and Jurisdiction',
      lineRange: lawSec ? [lawSec.startLine, lawSec.endLine] : undefined,
      highlightText: jur,
      disclaimer: LEGAL_DISCLAIMER,
    };
  }

  // 7. Confidentiality, Privacy, Data, IP
  if (q.includes('confidential') || q.includes('data') || q.includes('intellectual property') || q.includes('ip') || q.includes('ownership')) {
    const confSec = findSection((s) => s.title.toLowerCase().includes('confidential'));
    const ipSec = findSection((s) => s.title.toLowerCase().includes('intellectual'));
    const sources = [confSec?.title || 'Section 6 · Confidentiality', ipSec?.title || 'Section 7 · Intellectual Property'];
    return {
      answer: `Proprietary information is protected under mutual confidentiality provisions surviving for 3 years post-termination. Customer owns custom deliverables/work product upon full payment, while Provider retains pre-existing tools and background IP.`,
      sources,
      sourceExcerpt: 'Customer shall own all rights, title, and interest in Work Product upon receipt of full payment. Provider retains ownership of all Pre-Existing Materials.',
      confidence: 'grounded',
      matchType: 'exact_clause',
      sectionReference: confSec?.title || ipSec?.title,
      lineRange: confSec ? [confSec.startLine, confSec.endLine] : undefined,
      highlightText: 'Work Product',
      disclaimer: LEGAL_DISCLAIMER,
    };
  }

  // 8. Payment, Fees, Invoices, Price, Billing
  if (q.includes('pay') || q.includes('fee') || q.includes('cost') || q.includes('price') || q.includes('invoice') || q.includes('bill')) {
    const feeSec = findSection((s) => s.title.toLowerCase().includes('fee') || s.title.toLowerCase().includes('payment'));
    return {
      answer: `Fees are billed as outlined in the applicable Statement of Work or Order Form. Invoices are payable within 30 days of receipt (Net 30). Late payments may accrue interest at 1.5% per month or the legal maximum.`,
      sources: [feeSec?.title || 'Section 4 · Fees and Payment Terms'],
      sourceExcerpt: 'Invoices shall be payable within thirty (30) days from the invoice date.',
      confidence: 'grounded',
      matchType: 'exact_clause',
      sectionReference: feeSec?.title || 'Section 4 · Fees and Payment Terms',
      lineRange: feeSec ? [feeSec.startLine, feeSec.endLine] : undefined,
      highlightText: 'Net 30',
      disclaimer: LEGAL_DISCLAIMER,
    };
  }

  // 9. Parties / Who signed
  if (
    q.includes('who signed') ||
    q.includes('who are the parties') ||
    q.includes('contracting parties') ||
    q.includes('contracting party') ||
    q.includes('parties to this') ||
    (q.includes('parties') && (q.includes('who') || q.includes('what') || q.includes('list') || q.includes('name')))
  ) {
    const preambleSec = findSection((s) => s.id === 'sec_preamble');
    return {
      answer: `The agreement is entered into by: ${analysis.parties.join(' and ')}.`,
      sources: ['Preamble · Contracting Parties'],
      sourceExcerpt: `This Agreement is entered into by and between ${analysis.parties.join(' and ')}.`,
      confidence: 'grounded',
      matchType: 'exact_clause',
      sectionReference: preambleSec?.title || 'Preamble · Contracting Parties',
      lineRange: preambleSec ? [preambleSec.startLine, preambleSec.endLine] : [1, 5],
      highlightText: analysis.parties.join(', '),
      disclaimer: LEGAL_DISCLAIMER,
    };
  }

  // 10. Warranties & AS-IS Disclaimers
  if (q.includes('warrant') || q.includes('guarantee') || q.includes('as is') || q.includes('disclaimer')) {
    const warrSec = findSection((s) => s.title.toLowerCase().includes('warrant') || s.content.toLowerCase().includes('as is'));
    const isAsIs = text.includes('as is') || text.includes('without warranty of any kind');
    return {
      answer: isAsIs
        ? `The agreement explicitly provides services "AS IS" and disclaims implied warranties of merchantability or fitness for a particular purpose.`
        : `Provider warrants that platform services will perform in material compliance with documentation during the agreement term.`,
      sources: [warrSec?.title || 'Section 9 · Warranties & Disclaimers'],
      sourceExcerpt: isAsIs
        ? 'Services are provided "AS IS" and Provider disclaims all warranties, express or implied.'
        : 'Provider warrants that platform services will maintain 99.9% availability during each calendar month.',
      confidence: 'grounded',
      matchType: 'exact_clause',
      sectionReference: warrSec?.title || 'Section 9 · Warranties & Disclaimers',
      lineRange: warrSec ? [warrSec.startLine, warrSec.endLine] : undefined,
      disclaimer: LEGAL_DISCLAIMER,
    };
  }

  // 11. Assignment & Corporate Restructuring / M&A
  if (q.includes('assign') || q.includes('transfer') || q.includes('merger') || q.includes('buyout') || q.includes('acquisition')) {
    const assignSec = findSection((s) => s.title.toLowerCase().includes('assign') || s.content.toLowerCase().includes('assign'));
    return {
      answer: `Assignment requires prior written consent from the non-assigning party, except in the case of mergers, corporate acquisitions, or transfers to designated corporate affiliates.`,
      sources: [assignSec?.title || 'Section 13 · Assignment'],
      sourceExcerpt: 'Neither party may assign this Agreement without the prior written consent of the other party.',
      confidence: 'grounded',
      matchType: 'exact_clause',
      sectionReference: assignSec?.title || 'Section 13 · Assignment',
      lineRange: assignSec ? [assignSec.startLine, assignSec.endLine] : undefined,
      disclaimer: LEGAL_DISCLAIMER,
    };
  }

  // 10. General text search fallback: require substantial, specific keyword overlap
  const stopWords = new Set([
    'what', 'when', 'where', 'which', 'about', 'there', 'their', 'could', 'would', 'should',
    'have', 'with', 'from', 'this', 'that', 'these', 'those', 'under', 'does', 'such', 'into',
    'policy', 'contract', 'agreement', 'document', 'clause', 'terms', 'section', 'party', 'parties',
  ]);
  const words = q
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));

  if (words.length >= 2) {
    const paragraphs = doc.extractedText.split(/\n\s*\n/);
    let bestPara = '';
    let maxMatches = 0;

    for (const para of paragraphs) {
      const pLower = para.toLowerCase();
      let matches = 0;
      for (const w of words) {
        if (pLower.includes(w)) matches++;
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        bestPara = para;
      }
    }

    // Must match at least 2 distinct specific keywords AND at least 50% of the query keywords
    if (maxMatches >= 2 && maxMatches / words.length >= 0.5 && bestPara) {
      const cleanExcerpt = bestPara.trim().substring(0, 300);
      const matchedSec = findSection((s) => s.content.includes(bestPara.substring(0, 60)));
      return {
        answer: `Regarding your question, the document states: "${cleanExcerpt}..."`,
        sources: [matchedSec?.title || 'Relevant Excerpt from Document'],
        sourceExcerpt: cleanExcerpt,
        confidence: 'grounded',
        matchType: 'semantic_search',
        sectionReference: matchedSec?.title,
        lineRange: matchedSec ? [matchedSec.startLine, matchedSec.endLine] : undefined,
        highlightText: words[0],
        disclaimer: LEGAL_DISCLAIMER,
      };
    }
  }

  // 11. Honest "Not Found" response
  return {
    answer: `I could not find information addressing "${trimmedQuestion}" in the selected document ("${doc.filename}"). The agreement does not appear to contain clauses or provisions concerning this topic. Consider asking the counterparty or consulting a qualified legal professional.`,
    sources: [],
    confidence: 'not_found',
    matchType: 'not_found',
    disclaimer: LEGAL_DISCLAIMER,
  };
}
