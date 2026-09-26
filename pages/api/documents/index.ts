import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllDocuments, addDocument } from '@/services/documentStore';
import { parseDocument } from '@/services/documentParser';
import { analyzeDocumentWithGemini } from '@/services/geminiService';
import { checkRateLimit, sanitizeInput } from '@/utils/security';
import { DocumentMeta, DocumentAnalysis } from '@/types';

type DocumentsResponse = {
  documents: Array<{
    document: DocumentMeta;
    analysis: DocumentAnalysis;
  }>;
};

type CreateDocumentResponse = {
  document: DocumentMeta;
  analysis: DocumentAnalysis;
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DocumentsResponse | CreateDocumentResponse | { error: string }>,
) {
  // Rate limiting check
  if (!checkRateLimit(req, res, 40, 60 * 1000)) return;

  if (req.method === 'GET') {
    const docs = getAllDocuments();
    const result = await Promise.all(
      docs.map(async (doc) => ({
        document: doc,
        analysis: await analyzeDocumentWithGemini(doc),
      })),
    );
    return res.status(200).json({ documents: result });
  }

  if (req.method === 'POST') {
    const { filename, content, fileType, sizeBytes, mimeType } = req.body || {};

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'A valid filename is required for ingestion.' });
    }

    const cleanFilename = sanitizeInput(filename.trim(), 255);

    try {
      const parsed = await parseDocument({
        filename: cleanFilename,
        fileType,
        content: typeof content === 'string' ? content : '',
        sizeBytes: typeof sizeBytes === 'number' ? sizeBytes : undefined,
        mimeType: typeof mimeType === 'string' ? mimeType : undefined,
      });

      addDocument(parsed);
      const analysis = await analyzeDocumentWithGemini(parsed);

      return res.status(201).json({
        document: parsed,
        analysis,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Document ingestion failed.';
      return res.status(400).json({ error: message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed.' });
}
