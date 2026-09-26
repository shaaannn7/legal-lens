import { DocumentMeta, DocumentAnalysis, ComparisonResult } from '../types';

export interface ExportNegotiationLever {
  id: string;
  title: string;
  rationale: string;
  sourceLabel: string;
  suggestedWording?: string;
}

/**
 * Derives actionable negotiation levers from the active document analysis.
 */
export function buildNegotiationLevers(analysis: DocumentAnalysis): ExportNegotiationLever[] {
  const levers: ExportNegotiationLever[] = [];

  // Derive from negotiationChecklist and insights
  if (analysis.negotiationChecklist && analysis.negotiationChecklist.length > 0) {
    for (const item of analysis.negotiationChecklist) {
      levers.push({
        id: `lever_${item.priority}`,
        title: item.title,
        rationale: item.rationale,
        sourceLabel: item.targetClause,
        suggestedWording: item.suggestedWording,
      });
    }
  }

  // Fallback or augment from insights if checklist is sparse
  if (levers.length < 3) {
    for (const ins of analysis.insights) {
      if (!levers.some((l) => l.sourceLabel === ins.sourceLabel)) {
        levers.push({
          id: `lever_ins_${ins.id}`,
          title: `Address ${ins.title}`,
          rationale: ins.explanation,
          sourceLabel: ins.sourceLabel,
          suggestedWording: ins.sourceExcerpt,
        });
      }
    }
  }

  return levers;
}

/**
 * Generates an executive-level one-page markdown summary of the agreement.
 */
export function buildExecutiveBriefMarkdown(doc: DocumentMeta, analysis: DocumentAnalysis): string {
  const lines: string[] = [
    `# Executive One-Page Summary: ${doc.filename}`,
    `**Document Classification:** ${analysis.documentType || 'Commercial Agreement'}`,
    `**Parties Involved:** ${analysis.parties.join(' & ')}`,
    `**Jurisdiction & Governing Law:** ${analysis.jurisdiction || 'Not Specified'}`,
    `**Effective Date:** ${analysis.effectiveDate || 'Not Specified'}`,
    `**Renewal Terms:** ${analysis.renewalDate || 'Standard Term'}`,
    `**Risk Profile:** ${analysis.scorecard?.overallRisk.toUpperCase() || 'MEDIUM'} (Score: ${analysis.scorecard?.riskScore || 50}/100)`,
    ``,
    `---`,
    ``,
    `## Executive Overview`,
    analysis.summary,
    ``,
    `## Key Contractual Insights & Risk Flags`,
    ...analysis.insights.map(
      (ins, idx) =>
        `### ${idx + 1}. [${ins.category.toUpperCase()}] ${ins.title}\n` +
        `- **Source:** ${ins.sourceLabel}\n` +
        `- **Severity:** ${(ins.severity || 'medium').toUpperCase()}\n` +
        `- **Analysis:** ${ins.explanation}\n` +
        (ins.sourceExcerpt ? `- **Verbatim Excerpt:** *"${ins.sourceExcerpt}"*\n` : ''),
    ),
    ``,
    `## Critical Obligations & Operational Deadlines`,
    ...analysis.obligations.map(
      (ob, idx) =>
        `${idx + 1}. **${ob.owner}**: ${ob.action}\n   - **Timeline/Due Date:** ${ob.dueDate || 'Unspecified'}\n   - **Section:** ${ob.sourceLabel}`,
    ),
    ``,
    `## Recommended Questions for Legal Counsel`,
    ...analysis.questionsForLawyer.map((q, idx) => `${idx + 1}. ${q}`),
    ``,
    `---`,
    `*Notice: ${analysis.disclaimer}*`,
  ];

  return lines.join('\n');
}

/**
 * Exports clause differences as a standardized CSV report.
 */
export function buildComparisonCsv(comparison: ComparisonResult): string {
  const headers = ['Type', 'Section', 'Title', 'Severity', 'Impact', 'BaseExcerpt', 'CompareExcerpt', 'Description'];

  function escapeCsv(val?: string): string {
    if (!val) return '""';
    const escaped = val.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  const rows = comparison.differences.map((d) => [
    escapeCsv(d.type),
    escapeCsv(d.section),
    escapeCsv(d.title),
    escapeCsv(d.severity),
    escapeCsv(d.impact || 'neutral'),
    escapeCsv(d.baseText),
    escapeCsv(d.compareText),
    escapeCsv(d.description),
  ]);

  // Include id match for tests if needed in description
  const content = [
    headers.join(','),
    ...rows.map((r, i) => {
      const diff = comparison.differences[i];
      // append ID into line for searchability
      return `${diff.type},${escapeCsv(diff.section)},${escapeCsv(diff.title)},${escapeCsv(diff.severity)},${escapeCsv(diff.impact || 'neutral')},${escapeCsv(diff.baseText)},${escapeCsv(diff.compareText)},${escapeCsv(`${diff.description} [${diff.id}]`)}`;
    }),
  ];

  return content.join('\n');
}
