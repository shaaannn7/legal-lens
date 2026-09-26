import type { NextApiRequest, NextApiResponse } from 'next';
import { getDocumentById, deleteDocument, renameDocument } from '@/services/documentStore';
import { analyzeDocumentWithGemini } from '@/services/geminiService';
import { checkRateLimit, sanitizeInput } from '@/utils/security';
import { DocumentMeta, DocumentAnalysis } from '@/types';

type DocumentDetailResponse = {
  document: DocumentMeta;
  analysis: DocumentAnalysis;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DocumentDetailResponse | { success: boolean; message: string } | { error: string }>,
) {
  if (!checkRateLimit(req, res, 40, 60 * 1000)) return;

  const { id } = req.query;
  const docId = Array.isArray(id) ? id[0] : id;

  if (!docId) {
    return res.status(400).json({ error: 'Document ID is required.' });
  }

  const doc = getDocumentById(docId);
  if (!doc) {
    return res.status(404).json({ error: `Document with ID "${docId}" was not found.` });
  }

  if (req.method === 'GET') {
    const analysis = await analyzeDocumentWithGemini(doc);
    return res.status(200).json({
      document: doc,
      analysis,
    });
  }

  if (req.method === 'DELETE') {
    deleteDocument(docId);
    return res.status(200).json({
      success: true,
      message: `Document "${doc.filename}" was successfully removed.`,
    });
  }

  if (req.method === 'PATCH') {
    const { filename } = req.body || {};
    if (!filename || typeof filename !== 'string' || !filename.trim()) {
      return res.status(400).json({ error: 'A non-empty filename is required for renaming.' });
    }

    const cleanFilename = sanitizeInput(filename.trim(), 255);
    const updated = renameDocument(docId, cleanFilename);
    if (!updated) {
      return res.status(500).json({ error: 'Failed to rename document.' });
    }

    const analysis = await analyzeDocumentWithGemini(updated);
    return res.status(200).json({
      document: updated,
      analysis,
    });
  }

  res.setHeader('Allow', 'GET, DELETE, PATCH');
  return res.status(405).json({ error: 'Method not allowed.' });
}
