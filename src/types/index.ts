export type FileType = 'txt' | 'pdf' | 'doc' | 'docx';

export type ExtractionStatus = 'complete' | 'unsupported_in_demo' | 'failed';

export interface ParsedSection {
  id: string;
  number?: string;
  title: string;
  content: string;
  startLine: number;
  endLine: number;
}

export interface DocumentMeta {
  id: string;
  filename: string;
  fileType: FileType;
  sizeBytes: number;
  uploadedAt: string;
  extractedText: string;
  pageCount?: number;
  extractionStatus: ExtractionStatus;
  extractionError?: string;
  version?: string;
  tags?: string[];
}

export type InsightCategory = 'review' | 'risk' | 'obligation' | 'inconsistency' | 'protection' | 'financial';
export type SeverityLevel = 'low' | 'medium' | 'high';
export type InsightTaxonomy =
  | 'extracted_fact'
  | 'inferred_interpretation'
  | 'missing_information'
  | 'negotiation_suggestion'
  | 'warranties_disclaimers'
  | 'assignment_control'
  | 'financial_payment'
  | 'data_privacy_dpa'
  | 'insurance_minima'
  | 'non_compete_solicit';

export interface DocumentInsight {
  id: string;
  category: InsightCategory;
  taxonomy: InsightTaxonomy;
  title: string;
  explanation: string;
  sourceLabel: string;
  sourceExcerpt?: string;
  severity?: SeverityLevel;
  sectionId?: string;
  lineRange?: [number, number];
}

export interface Obligation {
  owner: string;
  action: string;
  dueDate?: string;
  sourceLabel: string;
  lineRange?: [number, number];
}

export interface RiskScorecard {
  overallRisk: 'high' | 'medium' | 'low';
  riskScore: number; // 0 to 100
  criticalCount: number;
  moderateCount: number;
  lowCount: number;
  summary: string;
}

export interface NegotiationLever {
  priority: number;
  title: string;
  rationale: string;
  targetClause: string;
  suggestedWording?: string;
}

export interface DocumentAnalysis {
  documentId: string;
  summary: string;
  documentType?: string;
  jurisdiction?: string;
  parties: string[];
  effectiveDate?: string;
  renewalDate?: string;
  contractValue?: string;
  paymentTerms?: string;
  feeCapMechanism?: string;
  sections: ParsedSection[];
  insights: DocumentInsight[];
  obligations: Obligation[];
  scorecard: RiskScorecard;
  negotiationChecklist: NegotiationLever[];
  missingProtections: string[];
  questionsForLawyer: string[];
  disclaimer: string;
  analyzedAt: string;
}

export type DifferenceType = 'added' | 'removed' | 'modified' | 'obligation_changed';

export interface ClauseDifference {
  id: string;
  type: DifferenceType;
  section: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  impact?: 'favorable' | 'unfavorable' | 'neutral';
  baseText?: string;
  compareText?: string;
  lineRange?: [number, number];
}

export interface ComparisonResult {
  baseDocId: string;
  baseDocName: string;
  compareDocId: string;
  compareDocName: string;
  summary: string;
  differences: ClauseDifference[];
  scoreComparison?: {
    baseScore: number;
    compareScore: number;
    riskTrend: 'improved' | 'worsened' | 'neutral';
  };
  disclaimer: string;
  comparedAt: string;
}

export interface AnalyzeRequest {
  documentId?: string;
  filename?: string;
  question: string;
}

export interface AnalyzeResponse {
  answer: string;
  sources: string[];
  sourceExcerpt?: string;
  confidence: 'grounded' | 'synthesized' | 'not_found';
  matchType?: 'exact_clause' | 'semantic_search' | 'not_found';
  sectionReference?: string;
  lineRange?: [number, number];
  highlightText?: string;
  suggestedFollowUps?: string[];
  disclaimer: string;
}
