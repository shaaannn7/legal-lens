import type { NextApiRequest, NextApiResponse } from 'next';
import { getDocumentById, getAllDocuments } from '@/services/documentStore';
import { analyzeDocument } from '@/services/analyzer';
import { answerDocumentQuestion } from '@/services/qaEngine';
import { AnalyzeResponse } from '@/types';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnalyzeResponse | { error: string }>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Only POST requests are supported.' });
  }

  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
  if (!question) {
    return res.status(400).json({ error: 'A question is required.' });
  }

  const documentId = typeof req.body?.documentId === 'string' ? req.body.documentId.trim() : '';
  const filename = typeof req.body?.filename === 'string' ? req.body.filename.trim() : '';

  let doc = documentId ? getDocumentById(documentId) : undefined;

  if (!doc && filename) {
    const allDocs = getAllDocuments();
    doc = allDocs.find((d) => d.filename.toLowerCase() === filename.toLowerCase());
  }

  // If a specific document was requested but not found, return explicit 404
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

  const analysis = analyzeDocument(doc);
  const result = answerDocumentQuestion(doc, analysis, question);

  return res.status(200).json(result);
}
