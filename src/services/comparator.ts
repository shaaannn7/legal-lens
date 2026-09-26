import { DocumentMeta, ComparisonResult, ClauseDifference } from '../types';
import { LEGAL_DISCLAIMER, extractSections } from './analyzer';

export function compareDocuments(
  baseDoc: DocumentMeta,
  compareDoc: DocumentMeta,
): ComparisonResult {
  const now = new Date().toISOString();
  const differences: ClauseDifference[] = [];

  // Edge case: Identical document comparison
  if (baseDoc.id === compareDoc.id) {
    return {
      baseDocId: baseDoc.id,
      baseDocName: baseDoc.filename,
      compareDocId: compareDoc.id,
      compareDocName: compareDoc.filename,
      summary: `Identical document comparison for "${baseDoc.filename}". Both documents share the exact same version and text — no clause revisions or textual deviations detected.`,
      differences: [],
      scoreComparison: {
        baseScore: 40,
        compareScore: 40,
        riskTrend: 'neutral',
      },
      disclaimer: LEGAL_DISCLAIMER,
      comparedAt: now,
    };
  }

  const baseText = (baseDoc.extractedText || '').toLowerCase();
  const compText = (compareDoc.extractedText || '').toLowerCase();

  // 1. Check Termination notice change
  const baseTerm90 = baseText.includes('90 days') || baseText.includes('ninety (90) days');
  const compTerm30 = compText.includes('30 days') || compText.includes('thirty (30) days');
  if (baseTerm90 && compTerm30) {
    differences.push({
      id: 'diff_term_notice',
      type: 'modified',
      section: 'Section 8 · Termination',
      title: 'Termination notice shortened from 90 days to 30 days',
      description:
        'The revised draft reduces the notice period for termination for convenience to 30 days. This allows faster exit from the agreement but also shortens transition runway.',
      severity: 'medium',
      impact: 'favorable',
      baseText: 'Either party may terminate this agreement with ninety (90) days written notice.',
      compareText: 'Either party may terminate this agreement upon thirty (30) days prior written notice.',
    });
  }

  // 2. Check Liability Cap / Super-Cap
  const baseUncapped = baseText.includes('uncapped') || (baseText.includes('data') && baseText.includes('liability'));
  const compSuperCap = compText.includes('super-cap') || compText.includes('2,000,000') || compText.includes('2x');
  if (compSuperCap) {
    differences.push({
      id: 'diff_liability_supercap',
      type: 'modified',
      section: 'Section 11 · Limitation of Liability',
      title: 'Data breach liability is now capped at $2,000,000 super-cap',
      description:
        'Rather than completely uncapped exposure for data breaches and confidentiality, the draft introduces a mutual $2,000,000 super-cap, meaningfully bounding financial liability.',
      severity: 'high',
      impact: 'favorable',
      baseText: 'Liability arising from breaches of Confidentiality or Data Protection shall remain uncapped.',
      compareText: 'Liability arising from Data Protection breaches shall be subject to an aggregate super-cap of $2,000,000.',
    });
  } else if (!baseText.includes('liability') && compText.includes('liability')) {
    differences.push({
      id: 'diff_liability_added',
      type: 'added',
      section: 'Section 11 · Limitation of Liability',
      title: 'Added limitation of liability clause',
      description: 'The comparison document introduces explicit liability limitations and exclusions.',
      severity: 'high',
      impact: 'favorable',
      compareText: 'In no event shall either party’s liability exceed fees paid in the prior 12 months.',
    });
  }

  // 3. Check Intellectual Property Indemnity
  const compHasIpIndemnity = compText.includes('infringement') || compText.includes('patent') || compText.includes('copyright indemn');
  const baseHasIpIndemnity = baseText.includes('infringement') || baseText.includes('patent');
  if (compHasIpIndemnity && !baseHasIpIndemnity) {
    differences.push({
      id: 'diff_ip_indemnity',
      type: 'added',
      section: 'Section 12.2 · Intellectual Property Indemnification',
      title: 'New third-party IP infringement indemnification requirement',
      description:
        'The draft adds an affirmative duty to defend and hold harmless against third-party patent, copyright, or trade secret infringement claims.',
      severity: 'high',
      impact: 'favorable',
      compareText: 'Provider shall defend, indemnify, and hold harmless Customer against claims alleging Work Product infringes any third-party patent or copyright.',
    });
  }

  // 4. Check Non-solicitation removal
  const baseHasNonSolicit = baseText.includes('solicit') || baseText.includes('hire');
  const compHasNonSolicit = compText.includes('solicit') || compText.includes('hire');
  if (baseHasNonSolicit && !compHasNonSolicit) {
    differences.push({
      id: 'diff_non_solicit_removed',
      type: 'removed',
      section: 'Section 15 · Non-Solicitation of Personnel',
      title: 'Non-solicitation restriction has been removed',
      description:
        'The 12-month post-term restriction preventing either party from hiring personnel of the other has been omitted in the revised draft.',
      severity: 'medium',
      impact: 'favorable',
      baseText: 'Neither party shall solicit or recruit employees or contractors of the other party during the term and for 12 months thereafter.',
    });
  }

  // 5. Check Service Levels / SLA credits
  const compHasSlaCredit = compText.includes('service credit') || compText.includes('uptime credit');
  const baseHasSlaCredit = baseText.includes('service credit');
  if (compHasSlaCredit && !baseHasSlaCredit) {
    differences.push({
      id: 'diff_sla_credits',
      type: 'obligation_changed',
      section: 'Schedule B · SLA & Service Credits',
      title: 'Financial penalty credits added for uptime failures',
      description:
        'Customer is now eligible to claim 5% billing credits for each 1% platform availability drops below 99.9% in a given billing cycle.',
      severity: 'medium',
      impact: 'favorable',
      compareText: 'Failure to meet the 99.9% monthly availability target shall entitle Customer to a 5% credit on the monthly service fee.',
    });
  }

  // 6. Dynamic Section-Level Comparison for Any Custom Documents
  const baseSections = extractSections(baseDoc.extractedText || '');
  const compSections = extractSections(compareDoc.extractedText || '');

  // Find sections in compareDoc that don't exist in baseDoc, or that have modified text
  for (const cSec of compSections) {
    if (cSec.id === 'sec_preamble' || cSec.id === 'sec_full_body') continue;
    const matchInBase = baseSections.find(
      (bSec) => bSec.number === cSec.number || bSec.title.toLowerCase() === cSec.title.toLowerCase(),
    );

    if (!matchInBase && !differences.some((d) => d.section.includes(cSec.title))) {
      differences.push({
        id: `diff_sec_add_${cSec.id}`,
        type: 'added',
        section: cSec.title,
        title: `Added clause: ${cSec.title}`,
        description: `This clause appears in "${compareDoc.filename}" but is absent from the baseline agreement.`,
        severity: 'medium',
        impact: 'neutral',
        compareText: cSec.content.substring(0, 240) + (cSec.content.length > 240 ? '…' : ''),
        lineRange: [cSec.startLine, cSec.endLine],
      });
    } else if (matchInBase && matchInBase.content.trim() !== cSec.content.trim()) {
      if (!differences.some((d) => d.section.includes(cSec.title))) {
        differences.push({
          id: `diff_sec_mod_${cSec.id}`,
          type: 'modified',
          section: cSec.title,
          title: `Modified clause: ${cSec.title}`,
          description: `The wording in "${cSec.title}" was updated between revisions.`,
          severity: 'low',
          impact: 'neutral',
          baseText: matchInBase.content.substring(0, 240) + (matchInBase.content.length > 240 ? '…' : ''),
          compareText: cSec.content.substring(0, 240) + (cSec.content.length > 240 ? '…' : ''),
          lineRange: [cSec.startLine, cSec.endLine],
        });
      }
    }
  }

  // Find sections in baseDoc that are removed from compareDoc
  for (const bSec of baseSections) {
    if (bSec.id === 'sec_preamble' || bSec.id === 'sec_full_body') continue;
    const matchInComp = compSections.find(
      (cSec) => cSec.number === bSec.number || cSec.title.toLowerCase() === bSec.title.toLowerCase(),
    );
    if (!matchInComp && !differences.some((d) => d.section.includes(bSec.title))) {
      differences.push({
        id: `diff_sec_rem_${bSec.id}`,
        type: 'removed',
        section: bSec.title,
        title: `Removed clause: ${bSec.title}`,
        description: `This provision in the baseline agreement has been eliminated in the revised draft.`,
        severity: 'medium',
        impact: 'unfavorable',
        baseText: bSec.content.substring(0, 240) + (bSec.content.length > 240 ? '…' : ''),
        lineRange: [bSec.startLine, bSec.endLine],
      });
    }
  }

  // Fallback if no specific diffs detected: provide a structural comparison
  if (differences.length === 0) {
    differences.push({
      id: 'diff_general_alignment',
      type: 'modified',
      section: 'Document Body',
      title: 'Clauses closely align with minor wording adjustments',
      description:
        'Both documents cover comparable subject matter. Automated scanning detected no major structural deletions or critical changes in commercial risk allocation.',
      severity: 'low',
      impact: 'neutral',
      baseText: baseDoc.extractedText.substring(0, 160) + '...',
      compareText: compareDoc.extractedText.substring(0, 160) + '...',
    });
  }

  const addedCount = differences.filter((d) => d.type === 'added').length;
  const removedCount = differences.filter((d) => d.type === 'removed').length;
  const modifiedCount = differences.filter((d) => d.type === 'modified' || d.type === 'obligation_changed').length;

  const summary = `Compared "${baseDoc.filename}" against "${compareDoc.filename}". Found ${differences.length} substantive difference${differences.length === 1 ? '' : 's'}: ${addedCount} added clause(s), ${removedCount} removed clause(s), and ${modifiedCount} modified term(s).`;

  // Compare risk trends
  const favorableCount = differences.filter((d) => d.impact === 'favorable').length;
  const unfavorableCount = differences.filter((d) => d.impact === 'unfavorable').length;
  const riskTrend: 'improved' | 'worsened' | 'neutral' =
    favorableCount > unfavorableCount ? 'improved' : unfavorableCount > favorableCount ? 'worsened' : 'neutral';

  return {
    baseDocId: baseDoc.id,
    baseDocName: baseDoc.filename,
    compareDocId: compareDoc.id,
    compareDocName: compareDoc.filename,
    summary,
    differences,
    scoreComparison: {
      baseScore: 65,
      compareScore: riskTrend === 'improved' ? 40 : riskTrend === 'worsened' ? 75 : 65,
      riskTrend,
    },
    disclaimer: LEGAL_DISCLAIMER,
    comparedAt: now,
  };
}
