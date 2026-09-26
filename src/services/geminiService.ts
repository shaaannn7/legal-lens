import { GoogleGenerativeAI } from '@google/generative-ai';
import { DocumentMeta, DocumentAnalysis, AnalyzeResponse, DocumentInsight } from '../types';
import { analyzeDocument, LEGAL_DISCLAIMER } from './analyzer';
import { answerDocumentQuestion } from './qaEngine';
import { globalAnalysisCache, globalQACache } from '../utils/cache';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

/**
 * Returns true if Gemini GenAI integration is available via API key.
 */
export function isGeminiAvailable(): boolean {
  return !!GEMINI_API_KEY;
}

/**
 * Generates an AI-powered legal document analysis using Google Gemini.
 * Falls back to deterministic parsing if Gemini is unavailable or errors out.
 */
export async function analyzeDocumentWithGemini(doc: DocumentMeta): Promise<DocumentAnalysis> {
  const cacheKey = `gemini_analysis_${doc.id}_${doc.filename}`;
  const cached = globalAnalysisCache.get(cacheKey);
  if (cached) return cached;

  // Baseline deterministic analysis
  const baseAnalysis = analyzeDocument(doc);

  if (!genAI || !doc.extractedText?.trim()) {
    globalAnalysisCache.set(cacheKey, baseAnalysis);
    return baseAnalysis;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `You are an expert legal AI assistant analyzing a legal document.
Analyze the following contract text and return a strict JSON object adhering to this schema:
{
  "summary": "2-3 sentence plain English executive summary",
  "documentType": "Detected contract type (e.g., Master Services Agreement, NDA, License)",
  "jurisdiction": "Governing law state/country if specified",
  "parties": ["Party A", "Party B"],
  "effectiveDate": "Effective date string if found",
  "renewalDate": "Renewal terms string",
  "paymentTerms": "Payment & invoice terms (e.g. Net 30)",
  "feeCapMechanism": "Fee cap details if specified",
  "riskScore": 45, // Number between 10 and 95
  "overallRisk": "low" | "medium" | "high",
  "criticalCount": 1,
  "moderateCount": 2,
  "lowCount": 1,
  "insights": [
    {
      "id": "ins_1",
      "category": "risk" | "obligation" | "protection" | "review",
      "taxonomy": "limitation_of_liability" | "term_renewal" | "termination" | "data_privacy_dpa" | "indemnification" | "confidentiality" | "other",
      "title": "Short descriptive title",
      "explanation": "Clear explanation of risk or terms",
      "sourceLabel": "Section X · Title",
      "sourceExcerpt": "Exact text quote",
      "severity": "high" | "medium" | "low"
    }
  ],
  "missingProtections": ["Missing clause 1", "Missing clause 2"],
  "questionsForLawyer": ["Question 1?", "Question 2?"],
  "aiAnalysisNotes": "Gemini AI verified analysis note"
}

Document Content:
${doc.extractedText.slice(0, 40000)}
`;

    const result = await model.generateContent(prompt);
    const textResponse = result.response.text();
    const aiData = JSON.parse(textResponse);

    const mergedAnalysis: DocumentAnalysis = {
      ...baseAnalysis,
      summary: aiData.summary || baseAnalysis.summary,
      documentType: aiData.documentType || baseAnalysis.documentType,
      jurisdiction: aiData.jurisdiction || baseAnalysis.jurisdiction,
      parties: Array.isArray(aiData.parties) && aiData.parties.length > 0 ? aiData.parties : baseAnalysis.parties,
      effectiveDate: aiData.effectiveDate || baseAnalysis.effectiveDate,
      renewalDate: aiData.renewalDate || baseAnalysis.renewalDate,
      paymentTerms: aiData.paymentTerms || baseAnalysis.paymentTerms,
      feeCapMechanism: aiData.feeCapMechanism || baseAnalysis.feeCapMechanism,
      scorecard: {
        overallRisk: aiData.overallRisk || baseAnalysis.scorecard.overallRisk,
        riskScore: typeof aiData.riskScore === 'number' ? aiData.riskScore : baseAnalysis.scorecard.riskScore,
        criticalCount: typeof aiData.criticalCount === 'number' ? aiData.criticalCount : baseAnalysis.scorecard.criticalCount,
        moderateCount: typeof aiData.moderateCount === 'number' ? aiData.moderateCount : baseAnalysis.scorecard.moderateCount,
        lowCount: typeof aiData.lowCount === 'number' ? aiData.lowCount : baseAnalysis.scorecard.lowCount,
        summary: aiData.summary || baseAnalysis.scorecard.summary,
      },
      insights: Array.isArray(aiData.insights) && aiData.insights.length > 0 ? aiData.insights : baseAnalysis.insights,
      missingProtections: Array.isArray(aiData.missingProtections) ? aiData.missingProtections : baseAnalysis.missingProtections,
      questionsForLawyer: Array.isArray(aiData.questionsForLawyer) ? aiData.questionsForLawyer : baseAnalysis.questionsForLawyer,
      disclaimer: LEGAL_DISCLAIMER,
      analyzedAt: new Date().toISOString(),
    };

    globalAnalysisCache.set(cacheKey, mergedAnalysis);
    return mergedAnalysis;
  } catch (error) {
    console.warn('Gemini analysis failed or timed out. Falling back to deterministic analysis:', error);
    globalAnalysisCache.set(cacheKey, baseAnalysis);
    return baseAnalysis;
  }
}

/**
 * Answers questions using Google Gemini AI grounded in document text.
 * Falls back to local qaEngine if Gemini API key is missing or fails.
 */
export async function answerQuestionWithGemini(
  doc: DocumentMeta,
  analysis: DocumentAnalysis,
  question: string,
): Promise<AnalyzeResponse> {
  const cacheKey = `gemini_qa_${doc.id}_${question.trim().toLowerCase()}`;
  const cached = globalQACache.get(cacheKey);
  if (cached) return cached;

  const baseAnswer = answerDocumentQuestion(doc, analysis, question);

  if (!genAI || !doc.extractedText?.trim()) {
    globalQACache.set(cacheKey, baseAnswer);
    return baseAnswer;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `You are Legal Lens, an expert AI legal assistant. Answer the user's question about the contract text below.
Answer accurately based ONLY on the provided contract text. Return a JSON object adhering to this schema:
{
  "answer": "Detailed plain-English answer to the user's question",
  "sources": ["Section 5 · Title", "Section 8 · Title"],
  "sourceExcerpt": "Exact contract quote grounding the answer",
  "confidence": "grounded" | "extrapolated" | "not_found",
  "matchType": "exact_clause" | "semantic_search" | "not_found",
  "sectionReference": "Section X · Title",
  "highlightText": "Short text phrase to highlight"
}

User Question: "${question}"

Contract Text:
${doc.extractedText.slice(0, 35000)}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const aiResp = JSON.parse(responseText);

    const answerResult: AnalyzeResponse = {
      answer: aiResp.answer || baseAnswer.answer,
      sources: Array.isArray(aiResp.sources) ? aiResp.sources : baseAnswer.sources,
      sourceExcerpt: aiResp.sourceExcerpt || baseAnswer.sourceExcerpt,
      confidence: aiResp.confidence || baseAnswer.confidence,
      matchType: aiResp.matchType || baseAnswer.matchType,
      sectionReference: aiResp.sectionReference || baseAnswer.sectionReference,
      highlightText: aiResp.highlightText || baseAnswer.highlightText,
      disclaimer: LEGAL_DISCLAIMER,
    };

    globalQACache.set(cacheKey, answerResult);
    return answerResult;
  } catch (error) {
    console.warn('Gemini Q&A failed or timed out. Falling back to local engine:', error);
    globalQACache.set(cacheKey, baseAnswer);
    return baseAnswer;
  }
}
