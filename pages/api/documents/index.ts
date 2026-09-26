import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllDocuments, addDocument } from '@/services/documentStore';
import { parseDocument } from '@/services/documentParser';
import { analyzeDocument } from '@/services/analyzer';
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
      sizeLimit: '15mb',
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DocumentsResponse | CreateDocumentResponse | { error: string }>,
) {
  if (req.method === 'GET') {
    const docs = getAllDocuments();
    const result = docs.map((doc) => ({
      document: doc,
      analysis: analyzeDocument(doc),
    }));
    return res.status(200).json({ documents: result });
  }

  if (req.method === 'POST') {
    const { filename, content, fileType, sizeBytes, mimeType } = req.body || {};

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'A filename is required for ingestion.' });
    }

    try {
      const parsed = await parseDocument({
        filename: filename.trim(),
        fileType,
        content: typeof content === 'string' ? content : '',
        sizeBytes: typeof sizeBytes === 'number' ? sizeBytes : undefined,
        mimeType: typeof mimeType === 'string' ? mimeType : undefined,
      });

      addDocument(parsed);
      const analysis = analyzeDocument(parsed);

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
