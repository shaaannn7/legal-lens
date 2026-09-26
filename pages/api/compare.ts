import type { NextApiRequest, NextApiResponse } from 'next';
import { getDocumentById, getAllDocuments } from '@/services/documentStore';
import { compareDocuments } from '@/services/comparator';
import { ComparisonResult } from '@/types';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ComparisonResult | { error: string }>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Only POST requests are supported.' });
  }

  const { baseDocId, compareDocId } = req.body || {};

  // If specific IDs were supplied, validate them explicitly without silent substitution
  if (baseDocId) {
    const baseDoc = getDocumentById(baseDocId);
    if (!baseDoc) {
      return res.status(404).json({ error: `Baseline agreement with ID "${baseDocId}" was not found.` });
    }
    if (!compareDocId) {
      return res.status(400).json({ error: 'A comparison document ID (compareDocId) is required.' });
    }
    const compareDoc = getDocumentById(compareDocId);
    if (!compareDoc) {
      return res.status(404).json({ error: `Comparison agreement with ID "${compareDocId}" was not found.` });
    }

    const result = compareDocuments(baseDoc, compareDoc);
    return res.status(200).json(result);
  }

  // If no IDs provided, use first two seed documents if available
  const allDocs = getAllDocuments();
  if (allDocs.length < 2) {
    return res.status(400).json({ error: 'At least two documents are required in the workspace to perform a comparison.' });
  }

  const result = compareDocuments(allDocs[0], allDocs[1]);
  return res.status(200).json(result);
}
