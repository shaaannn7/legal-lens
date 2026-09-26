import type { NextApiRequest, NextApiResponse } from 'next';
import { getDocumentById, getAllDocuments } from '@/services/documentStore';
import { analyzeDocumentWithGemini, answerQuestionWithGemini } from '@/services/geminiService';
import { checkRateLimit, sanitizePromptInput } from '@/utils/security';
import { AnalyzeResponse } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnalyzeResponse | { error: string }>,
) {
  // Enforce security rate limiting
  if (!checkRateLimit(req, res, 30, 60 * 1000)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Only POST requests are supported.' });
  }

  const rawQuestion = typeof req.body?.question === 'string' ? req.body.question : '';
  const question = sanitizePromptInput(rawQuestion);

  if (!question) {
    return res.status(400).json({ error: 'A valid question is required.' });
  }

  const documentId = typeof req.body?.documentId === 'string' ? req.body.documentId.trim() : '';
  const filename = typeof req.body?.filename === 'string' ? req.body.filename.trim() : '';

  let doc = documentId ? getDocumentById(documentId) : undefined;

  if (!doc && filename) {
    const allDocs = getAllDocuments();
    doc = allDocs.find((d) => d.filename.toLowerCase() === filename.toLowerCase());
  }

  // If a specific document was requested but not found
  if ((documentId || filename) && !doc) {
    return res.status(404).json({
      error: `Specified document "${documentId || filename}" was not found in the workspace repository.`,
    });
  }

  // If no document was requested at all, pick active document or fail gracefully
  if (!doc) {
    const allDocs = getAllDocuments();
    doc = allDocs[0];
  }

  if (!doc) {
    return res.status(404).json({
      error: 'No active document is available to analyze. Please upload or select a document first.',
    });
  }

  // Call Gemini AI-enhanced document analysis & Q&A
  const analysis = await analyzeDocumentWithGemini(doc);
  const result = await answerQuestionWithGemini(doc, analysis, question);

  return res.status(200).json(result);
}
