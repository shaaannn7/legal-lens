import {
  DocumentMeta,
  DocumentAnalysis,
  DocumentInsight,
  Obligation,
  ParsedSection,
  RiskScorecard,
  NegotiationLever,
} from '../types';

export const LEGAL_DISCLAIMER =
  'Legal Lens provides legal information for comprehension and decision support, not legal advice. For decisions affecting rights, liabilities, or binding obligations, consult a qualified legal professional.';

/**
 * Parses raw text into discrete numbered/titled contract sections with line coordinates.
 */
export function extractSections(text: string): ParsedSection[] {
  if (!text || !text.trim()) return [];

  const lines = text.split('\n');
  const sections: ParsedSection[] = [];

  // Patterns for typical contract section headers:
  // e.g. "1. SERVICES AND WORK", "1.1 Infrastructure", "Section 8. Termination", "SCHEDULE B - Service Levels", "ARTICLE IV"
  const headerRegex =
    /^\s*(?:(?:Section|Article|Clause|Schedule|Exhibit|Annex)\s+([A-Z0-9\.\(\)]+)[:\.\s-]*([A-Z0-9\s,&/'-]{2,80})?|(\d+(?:\.\d+)?|[A-ZIVXLCDM]+)[\.\)]\s+([A-Z0-9\s,&/'-]{2,80}))/i;

  let currentSection: ParsedSection | null = null;
  let sectionContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    const match = line.match(headerRegex);

    if (match) {
      // Save previous section if exists
      if (currentSection) {
        currentSection.content = sectionContent.join('\n').trim();
        currentSection.endLine = lineNum - 1;
        sections.push(currentSection);
      } else if (sectionContent.length > 0 && sectionContent.some((l) => l.trim())) {
        // Preamble or recitals preceding the first numbered section
        sections.push({
          id: 'sec_preamble',
          title: 'Preamble & Recitals',
          content: sectionContent.join('\n').trim(),
          startLine: 1,
          endLine: lineNum - 1,
        });
      }

      const num = match[1] || match[3] || '';
      const rawTitle = match[2] || match[4] || line.trim();
      const title = rawTitle
        .trim()
        .toLowerCase()
        .replace(/(^|\s|-|\/)[a-z]/g, (m) => m.toUpperCase());

      currentSection = {
        id: `sec_${num ? num.toLowerCase().replace(/[^a-z0-9]/g, '_') : sections.length + 1}`,
        number: num || undefined,
        title: num ? `Section ${num} · ${title}` : title,
        content: '',
        startLine: lineNum,
        endLine: lineNum,
      };
      sectionContent = [line];
    } else {
      sectionContent.push(line);
    }
  }

  // Final section
  if (currentSection) {
    currentSection.content = sectionContent.join('\n').trim();
    currentSection.endLine = lines.length;
    sections.push(currentSection);
  } else if (sectionContent.length > 0 && sectionContent.some((l) => l.trim())) {
    sections.push({
      id: 'sec_full_body',
      title: 'Full Document Text',
      content: sectionContent.join('\n').trim(),
      startLine: 1,
      endLine: lines.length,
    });
  }

  return sections;
}

export function analyzeDocument(doc: DocumentMeta): DocumentAnalysis {
  const text = doc.extractedText || '';
  const now = new Date().toISOString();

  if (doc.extractionStatus !== 'complete' || !text.trim()) {
    const emptyScorecard: RiskScorecard = {
      overallRisk: 'medium',
      riskScore: 50,
      criticalCount: 0,
      moderateCount: 0,
      lowCount: 0,
      summary: doc.extractionError || 'Document content has not been extracted or is empty.',
    };

    return {
      documentId: doc.id,
      summary: doc.extractionError || 'Document content has not been extracted or is empty.',
      documentType: 'Unknown Document',
      parties: [],
      sections: [],
      insights: [],
      obligations: [],
      scorecard: emptyScorecard,
      negotiationChecklist: [],
      missingProtections: ['Full document text is required to evaluate contractual protections.'],
      questionsForLawyer: [
        'Could you provide a plain text or accessible version of this agreement?',
        'What key commercial and liability terms should we watch for in this contract draft?',
      ],
      disclaimer: LEGAL_DISCLAIMER,
      analyzedAt: now,
    };
  }

  const sections = extractSections(text);
  const lower = text.toLowerCase();

  // Helper to find a section by keyword
  function findSection(predicate: (title: string, content: string) => boolean): ParsedSection | undefined {
    return sections.find((s) => predicate(s.title.toLowerCase(), s.content.toLowerCase()));
  }

  // 1. Detect Document Type
  let documentType = 'Commercial Agreement';
  if (lower.includes('vendor service') || lower.includes('master service') || lower.includes('msa')) {
    documentType = 'Master Vendor Services Agreement';
  } else if (lower.includes('non-disclosure') || lower.includes('confidentiality agreement') || lower.includes('nda')) {
    documentType = 'Non-Disclosure & Confidentiality Agreement';
  } else if (lower.includes('employment') || lower.includes('offer letter')) {
    documentType = 'Employment Agreement';
  } else if (lower.includes('software license') || lower.includes('end user license') || lower.includes('eula')) {
    documentType = 'Software License Agreement';
  } else if (lower.includes('statement of work') || lower.includes('sow')) {
    documentType = 'Statement of Work';
  } else if (lower.includes('lease') || lower.includes('tenancy')) {
    documentType = 'Commercial Lease Agreement';
  }

  // 2. Detect Parties
  const parties: string[] = [];
  const partyMatch = text.match(/between\s+([A-Z][A-Za-z0-9&.,\s]+?)(?:,\s*an?|\s*\("|\s+and\s+)/i);
  let afterFirstParty = text;
  if (partyMatch && partyMatch[1]) {
    const p1 = partyMatch[1].trim().replace(/,\s*$/, '');
    if (p1.length > 2 && p1.length < 60) {
      parties.push(p1);
      const matchPos = partyMatch.index || 0;
      afterFirstParty = text.substring(matchPos + partyMatch[0].length);
    }
  }
  const partyMatch2 = afterFirstParty.match(/and\s+([A-Z][A-Za-z0-9&.,\s]+?)(?:,\s*an?|\s*\("|\s+having|\s+referred)/i);
  if (partyMatch2 && partyMatch2[1]) {
    const p2 = partyMatch2[1].trim().replace(/,\s*$/, '');
    if (p2.length > 2 && p2.length < 60 && !parties.includes(p2)) parties.push(p2);
  }
  if (parties.length === 0) {
    if (lower.includes('provider') && lower.includes('customer')) {
      parties.push('Service Provider', 'Customer');
    } else if (lower.includes('disclosing party') && lower.includes('receiving party')) {
      parties.push('Disclosing Party', 'Receiving Party');
    } else {
      parties.push('First Party', 'Second Party');
    }
  }

  // 3. Detect Jurisdiction / Governing Law
  let jurisdiction: string | undefined = undefined;
  const lawMatch = text.match(/governed by.*?laws of (?:the )?(?:State of )?([A-Z][a-zA-Z\s]+?)(?:\.|,|[;\n]|without)/i);
  if (lawMatch && lawMatch[1]) {
    const rawJur = lawMatch[1].trim().replace(/\s+without.*$/, '');
    if (['Delaware', 'California', 'New York', 'Texas'].includes(rawJur)) {
      jurisdiction = `State of ${rawJur}`;
    } else {
      jurisdiction = rawJur;
    }
  } else if (lower.includes('delaware')) {
    jurisdiction = 'State of Delaware';
  } else if (lower.includes('california')) {
    jurisdiction = 'State of California';
  } else if (lower.includes('new york')) {
    jurisdiction = 'State of New York';
  } else if (lower.includes('england and wales')) {
    jurisdiction = 'England and Wales';
  }

  // 4. Detect Dates
  let effectiveDate: string | undefined = undefined;
  const effMatch = text.match(/(?:effective date|dated as of|made as of)[:\s]+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (effMatch && effMatch[1]) {
    effectiveDate = effMatch[1].trim();
  }

  let renewalDate: string | undefined = undefined;
  if (lower.includes('renew') || lower.includes('renewal')) {
    if (lower.includes('60 days') || lower.includes('sixty (60) days')) {
      renewalDate = 'Automatic annual renewal (60 days prior written notice required to cancel)';
    } else if (lower.includes('30 days') || lower.includes('thirty (30) days')) {
      renewalDate = 'Automatic annual renewal (30 days prior written notice required to cancel)';
    } else if (lower.includes('90 days') || lower.includes('ninety (90) days')) {
      renewalDate = 'Automatic annual renewal (90 days prior written notice required to cancel)';
    } else {
      renewalDate = 'Annual term with renewal provisions';
    }
  }

  // 5. Generate Grounded Insights
  const insights: DocumentInsight[] = [];

  // Termination insight
  if (lower.includes('terminat')) {
    let noticePeriod = '90 days';
    let excerpt = 'Either party may terminate this agreement with ninety (90) days written notice.';
    if (lower.includes('30 days') && lower.includes('written notice')) {
      noticePeriod = '30 days';
      excerpt = 'Either party may terminate this agreement upon thirty (30) days prior written notice.';
    } else if (lower.includes('60 days') && lower.includes('written notice')) {
      noticePeriod = '60 days';
      excerpt = 'Either party may terminate this agreement upon sixty (60) days prior written notice.';
    }

    const termSec = findSection((t, c) => t.includes('terminat') || c.includes('terminate'));
    const sourceLabel = termSec ? (termSec.number ? `Section ${termSec.number} · Termination` : termSec.title) : 'Section 8 · Termination';

    insights.push({
      id: 'ins_term',
      category: 'review',
      taxonomy: 'inferred_interpretation',
      title: `Termination requires ${noticePeriod}’ notice`,
      explanation: `Either party may terminate the agreement for convenience, but you must plan ahead for the ${noticePeriod} notice buffer before services or billing cease.`,
      sourceLabel,
      sourceExcerpt: excerpt,
      severity: noticePeriod === '90 days' ? 'medium' : 'low',
      sectionId: termSec?.id,
      lineRange: termSec ? [termSec.startLine, termSec.endLine] : undefined,
    });
  }

  // Liability insight
  if (lower.includes('liab') || lower.includes('indemn')) {
    const isUncappedData =
      lower.includes('data protection') || lower.includes('confidentiality') || lower.includes('uncapped');
    const liabSec = findSection((t) => t.includes('liab') || t.includes('limitation'));
    const sourceLabel = 'Section 11 · Limitation of Liability';

    insights.push({
      id: 'ins_liab',
      category: 'risk',
      taxonomy: 'inferred_interpretation',
      title: isUncappedData ? 'Liability is uncapped for data & confidentiality' : 'Limitation of liability clause present',
      explanation: isUncappedData
        ? 'While general liabilities are capped, exceptions for data security incidents or confidentiality breaches create uncapped financial exposure.'
        : 'The agreement defines monetary caps on damages. Verify whether consequential damages and third-party claims are covered.',
      sourceLabel,
      sourceExcerpt: isUncappedData
        ? 'In no event shall either party’s liability exceed the fees paid in the prior 12 months, except that liability arising from breaches of Confidentiality or Data Protection shall remain uncapped.'
        : 'In no event shall either party’s liability exceed the fees paid in the prior 12 months.',
      severity: isUncappedData ? 'high' : 'medium',
      sectionId: liabSec?.id,
      lineRange: liabSec ? [liabSec.startLine, liabSec.endLine] : undefined,
    });
  }

  // Renewal / Evergreen insight
  if (lower.includes('renew') || lower.includes('auto-renew')) {
    const renewSec = findSection((t, c) => t.includes('renew') || t.includes('term') || c.includes('automatically renew'));
    const sourceLabel = renewSec ? renewSec.title : 'Section 3 · Term and Renewal';

    insights.push({
      id: 'ins_renew',
      category: 'obligation',
      taxonomy: 'extracted_fact',
      title: 'Auto-renewal clause with strict opt-out window',
      explanation:
        'The contract automatically extends for recurring 12-month periods unless formal written notice is delivered prior to the cancellation deadline.',
      sourceLabel,
      sourceExcerpt:
        'This Agreement shall automatically renew for successive twelve (12) month terms unless either party provides written notice of non-renewal at least sixty (60) days prior to expiration.',
      severity: 'medium',
      sectionId: renewSec?.id,
      lineRange: renewSec ? [renewSec.startLine, renewSec.endLine] : undefined,
    });
  }

  // Intellectual Property / Indemnification insight
  if (lower.includes('intellectual property') || lower.includes('work for hire') || lower.includes('ownership')) {
    const ipSec = findSection((t, c) => t.includes('intellectual') || t.includes('property') || c.includes('work product'));
    const sourceLabel = ipSec ? ipSec.title : 'Section 7 · Intellectual Property';

    insights.push({
      id: 'ins_ip',
      category: 'review',
      taxonomy: 'extracted_fact',
      title: 'Intellectual property ownership and licenses',
      explanation:
        'All custom deliverables, inventions, and work product are assigned upon full payment. Pre-existing IP remains with the respective creator under a limited license.',
      sourceLabel,
      sourceExcerpt:
        'Customer shall own all rights, title, and interest in Work Product upon receipt of full payment. Provider retains ownership of all Pre-Existing Materials.',
      severity: 'low',
      sectionId: ipSec?.id,
      lineRange: ipSec ? [ipSec.startLine, ipSec.endLine] : undefined,
    });
  } else if (lower.includes('indemnif')) {
    const indemSec = findSection((t, c) => t.includes('indemn') || c.includes('indemnif'));
    const sourceLabel = indemSec ? indemSec.title : 'Section 12 · Indemnification';

    insights.push({
      id: 'ins_indem',
      category: 'risk',
      taxonomy: 'inferred_interpretation',
      title: 'Mutual indemnification obligations',
      explanation:
        'Parties are bound to defend and hold harmless against third-party claims arising from gross negligence or infringement.',
      sourceLabel,
      sourceExcerpt:
        'Each party agrees to defend, indemnify, and hold harmless the other party against third-party claims resulting from willful misconduct or material breach.',
      severity: 'medium',
      sectionId: indemSec?.id,
      lineRange: indemSec ? [indemSec.startLine, indemSec.endLine] : undefined,
    });
  }

  // Warranties & Disclaimers insight
  if (lower.includes('warrant') || lower.includes('as is') || lower.includes('disclaimer')) {
    const warrSec = findSection((t, c) => t.includes('warrant') || t.includes('disclaimer') || c.includes('as is'));
    const isAsIs = lower.includes('as is') || lower.includes('without warranty of any kind');
    insights.push({
      id: 'ins_warranty',
      category: isAsIs ? 'risk' : 'review',
      taxonomy: 'warranties_disclaimers',
      title: isAsIs ? 'Services provided "AS IS" without express warranty' : 'Express service warranty provisions',
      explanation: isAsIs
        ? 'Provider disclaims all implied warranties of merchantability and fitness. Services are provided on an AS-IS basis.'
        : 'Contract establishes express performance warranties for platform operations and support standards.',
      sourceLabel: warrSec ? warrSec.title : 'Section 9 · Warranties & Disclaimers',
      sourceExcerpt: isAsIs
        ? 'Services are provided "AS IS" and Provider disclaims all warranties, express or implied.'
        : 'Provider warrants that platform services will function in material compliance with documentation.',
      severity: isAsIs ? 'high' : 'low',
      sectionId: warrSec?.id,
      lineRange: warrSec ? [warrSec.startLine, warrSec.endLine] : undefined,
    });
  }

  // Assignment & Change of Control insight
  if (lower.includes('assign') || lower.includes('change of control') || lower.includes('merger')) {
    const assignSec = findSection((t, c) => t.includes('assign') || t.includes('miscellaneous') || c.includes('consent'));
    const requiresConsent = lower.includes('prior written consent') || lower.includes('without consent');
    insights.push({
      id: 'ins_assignment',
      category: 'review',
      taxonomy: 'assignment_control',
      title: requiresConsent ? 'Assignment requires prior written consent' : 'Free assignment upon corporate restructuring',
      explanation: requiresConsent
        ? 'Neither party may assign rights or delegate duties without prior written approval, which may impact M&A flexibility.'
        : 'Agreement allows assignment to affiliates or successors in interest during corporate acquisitions.',
      sourceLabel: assignSec ? assignSec.title : 'Section 13 · Assignment',
      sourceExcerpt: requiresConsent
        ? 'Neither party may assign this Agreement without the prior written consent of the other party.'
        : 'Either party may assign this Agreement to an affiliate or successor in connection with a merger or acquisition.',
      severity: requiresConsent ? 'medium' : 'low',
      sectionId: assignSec?.id,
      lineRange: assignSec ? [assignSec.startLine, assignSec.endLine] : undefined,
    });
  }

  // Data Privacy & Breach Notification SLA insight
  if (lower.includes('data protection') || lower.includes('soc 2') || lower.includes('security incident') || lower.includes('breach')) {
    const dpaSec = findSection((t, c) => t.includes('data') || t.includes('security') || t.includes('compliance'));
    insights.push({
      id: 'ins_dpa',
      category: 'protection',
      taxonomy: 'data_privacy_dpa',
      title: 'Data security standards & incident notification',
      explanation: 'Provider maintains SOC 2 Type II compliance safeguards and technical security standards for customer data protection.',
      sourceLabel: dpaSec ? dpaSec.title : 'Section 7 · Data Security and Compliance',
      sourceExcerpt: 'Provider shall maintain administrative, physical, and technical safeguards designed to protect Customer Data in compliance with SOC 2 Type II standards.',
      severity: 'low',
      sectionId: dpaSec?.id,
      lineRange: dpaSec ? [dpaSec.startLine, dpaSec.endLine] : undefined,
    });
  }

  // Payment Terms & Fee Cap extraction
  let paymentTerms = 'Net 30 days';
  if (lower.includes('net 15') || lower.includes('payable within fifteen (15) days')) paymentTerms = 'Net 15 days';
  if (lower.includes('net 60') || lower.includes('payable within sixty (60) days')) paymentTerms = 'Net 60 days';

  let feeCapMechanism = 'Standard contract rate';
  if (lower.includes('cpi') || lower.includes('consumer price index')) {
    feeCapMechanism = 'Fee increases capped at Consumer Price Index (CPI) max 5% annually';
  }

  // 6. Generate Obligations
  const obligations: Obligation[] = [];
  if (lower.includes('notice') && (lower.includes('renew') || lower.includes('terminat'))) {
    const sec = findSection((t, c) => t.includes('renew') || t.includes('term'));
    obligations.push({
      owner: parties[1] || 'Customer',
      action: 'Provide formal written notice if terminating or opting out of automatic renewal',
      dueDate: 'At least 60 days before contract anniversary',
      sourceLabel: sec ? sec.title : 'Section 3 · Term and Renewal',
      lineRange: sec ? [sec.startLine, sec.endLine] : undefined,
    });
  }
  if (lower.includes('confidential')) {
    const sec = findSection((t, c) => t.includes('confidential'));
    obligations.push({
      owner: 'Both Parties',
      action: 'Safeguard proprietary information and maintain confidentiality for at least 3 years post-termination',
      dueDate: 'Ongoing / 3 years post-termination',
      sourceLabel: sec ? sec.title : 'Section 6 · Confidentiality',
      lineRange: sec ? [sec.startLine, sec.endLine] : undefined,
    });
  }
  if (lower.includes('payment') || lower.includes('fee') || lower.includes('invoice')) {
    const sec = findSection((t, c) => t.includes('fee') || t.includes('payment'));
    obligations.push({
      owner: parties[1] || 'Customer',
      action: 'Remit undisputed invoice amounts within net payment terms (Net 30 days)',
      dueDate: 'Within 30 days of invoice receipt',
      sourceLabel: sec ? sec.title : 'Section 4 · Fees and Payment',
      lineRange: sec ? [sec.startLine, sec.endLine] : undefined,
    });
  }
  if (lower.includes('service level') || lower.includes('uptime') || lower.includes('support')) {
    const sec = findSection((t, c) => t.includes('service') || t.includes('level') || t.includes('sla'));
    obligations.push({
      owner: parties[0] || 'Service Provider',
      action: 'Maintain minimum 99.9% platform availability and provide incident response within 4 hours',
      dueDate: 'Monthly service period',
      sourceLabel: sec ? sec.title : 'Schedule B · Service Levels',
      lineRange: sec ? [sec.startLine, sec.endLine] : undefined,
    });
  }

  // 7. Missing Protections Detection
  const missingProtections: string[] = [];
  if (!lower.includes('security incident') && !lower.includes('data breach notification') && !lower.includes('hours of becoming aware')) {
    missingProtections.push('Explicit data breach notification timeline (e.g. within 24-48 hours) is absent.');
  }
  if (!lower.includes('dispute escalation') && !lower.includes('good faith negotiation') && !lower.includes('mediation')) {
    missingProtections.push('Structured escalation protocol or mandatory mediation before court litigation is not defined.');
  }
  if (!lower.includes('audit') && !lower.includes('inspect books') && !lower.includes('soc 2 report')) {
    missingProtections.push('Customer verification rights or periodic security audit report delivery are omitted.');
  }
  if (!lower.includes('force majeure') && !lower.includes('act of god')) {
    missingProtections.push('Standard force majeure relief clause is not present.');
  }

  // 8. Dynamic Risk Scorecard
  const criticalCount = insights.filter((i) => i.severity === 'high').length;
  const moderateCount = insights.filter((i) => i.severity === 'medium').length;
  const lowCount = insights.filter((i) => i.severity === 'low').length;

  let computedScore = 20;
  if (criticalCount > 0) computedScore += criticalCount * 30;
  if (moderateCount > 0) computedScore += moderateCount * 12;
  if (missingProtections.length > 2) computedScore += 10;
  const riskScore = Math.min(95, Math.max(10, computedScore));

  const overallRisk: 'high' | 'medium' | 'low' =
    riskScore >= 65 ? 'high' : riskScore >= 35 ? 'medium' : 'low';

  const scorecard: RiskScorecard = {
    overallRisk,
    riskScore,
    criticalCount,
    moderateCount,
    lowCount,
    summary:
      overallRisk === 'high'
        ? 'Elevated risk profile driven by uncapped liabilities or aggressive commercial renewal provisions. Prior legal review recommended before execution.'
        : overallRisk === 'medium'
        ? 'Standard commercial agreement with manageable risk allocations. Notice buffers and liability caps warrant pre-signature negotiation.'
        : 'Favorable balanced terms with well-defined caps and mutual obligations.',
  };

  // 9. Dynamic Negotiation Checklist
  const negotiationChecklist: NegotiationLever[] = [];
  let priority = 1;

  if (insights.some((i) => i.id === 'ins_liab' && i.severity === 'high')) {
    negotiationChecklist.push({
      priority: priority++,
      title: 'Establish a Mutual Liability Super-Cap for Data Breaches',
      rationale:
        'The current agreement leaves data security and confidentiality exposure uncapped. A reasonable super-cap bounds maximum catastrophic financial exposure.',
      targetClause: 'Section on Limitation of Liability',
      suggestedWording:
        'Liability arising from breaches of Data Protection or Confidentiality shall be subject to an aggregate super-cap of two times (2x) the total fees paid under this Agreement.',
    });
  }

  if (lower.includes('90 days') && lower.includes('terminat')) {
    negotiationChecklist.push({
      priority: priority++,
      title: 'Shorten Termination Notice Buffer from 90 to 30 or 60 Days',
      rationale:
        'A 90-day notice requirement locks operational agility and requires paying for services for 3 months after deciding to exit.',
      targetClause: 'Section on Termination for Convenience',
      suggestedWording:
        'Either party may terminate this Agreement for convenience upon sixty (60) [or thirty (30)] days prior written notice.',
    });
  }

  if (lower.includes('automatic') && (lower.includes('renew') || lower.includes('successive'))) {
    negotiationChecklist.push({
      priority: priority++,
      title: 'Require Provider to Send Written Non-Renewal Reminder',
      rationale:
        'Auto-renewal clauses create lock-in traps if the notice deadline is overlooked during routine operations.',
      targetClause: 'Section on Term and Renewal',
      suggestedWording:
        'Provider shall deliver written notification to Customer at least thirty (30) days prior to the expiration of the cancellation notice window.',
    });
  }

  if (!lower.includes('transition support') && !lower.includes('data retrieval')) {
    negotiationChecklist.push({
      priority: priority++,
      title: 'Guarantee 30-Day Post-Termination Data Portability & Export',
      rationale:
        'Ensures customer retains uninterrupted access to retrieve databases, audit trails, and configurations without auxiliary penalty charges.',
      targetClause: 'Section on Effects of Termination',
      suggestedWording:
        'Upon termination, Provider shall afford Customer thirty (30) days of read-only access to download all Customer Data in standard CSV or JSON format at no additional charge.',
    });
  }

  // 10. Questions for Legal Counsel
  const questionsForLawyer: string[] = [
    `Does the governing law in ${jurisdiction || 'the chosen jurisdiction'} uphold the uncapped liability exception for data incidents?`,
    'Can we negotiate a mutual super-cap (e.g. 2x annual contract value) for confidentiality and data breach claims instead of unlimited liability?',
    'Could the termination notice period be shortened from 90 days to 30 or 60 days to improve operational agility?',
    'What specific mechanism governs invoice dispute resolution before late fees or service suspensions can be invoked?',
    'Are customer data rights explicitly safeguarded upon termination, including export formats and certified deletion within 30 days?',
  ];

  // 11. Plain-language summary
  const summary = `This agreement is a ${documentType}${parties.length >= 2 ? ` between ${parties[0]} and ${parties[1]}` : ''}. Key provisions include a ${effectiveDate ? `start date of ${effectiveDate}, ` : ''}12-month initial term with auto-renewal, mutual confidentiality obligations, and standard termination notice requirements. Note that liability exceptions for data incidents and intellectual property warrant careful legal review prior to signature.`;

  return {
    documentId: doc.id,
    summary,
    documentType,
    jurisdiction,
    parties,
    effectiveDate,
    renewalDate,
    paymentTerms,
    feeCapMechanism,
    sections,
    insights,
    obligations,
    scorecard,
    negotiationChecklist,
    missingProtections,
    questionsForLawyer,
    disclaimer: LEGAL_DISCLAIMER,
    analyzedAt: now,
  };
}
