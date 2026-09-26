import type { NextApiRequest, NextApiResponse } from 'next';
import { getDocumentById, getAllDocuments } from '@/services/documentStore';
import { compareDocuments } from '@/services/comparator';
import { checkRateLimit } from '@/utils/security';
import { globalCompareCache } from '@/utils/cache';
import { ComparisonResult } from '@/types';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ComparisonResult | { error: string }>,
) {
  // Enforce security rate limiting
  if (!checkRateLimit(req, res, 30, 60 * 1000)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Only POST requests are supported.' });
  }

  const { baseDocId, compareDocId } = req.body || {};

  // If specific IDs were supplied, validate them explicitly
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

    const cacheKey = `compare_${baseDocId}_${compareDocId}`;
    const cached = globalCompareCache.get(cacheKey);
    if (cached) return res.status(200).json(cached);

    const result = compareDocuments(baseDoc, compareDoc);
    globalCompareCache.set(cacheKey, result);
    return res.status(200).json(result);
  }

  // If no IDs provided, use first two seed documents if available
  const allDocs = getAllDocuments();
  if (allDocs.length < 2) {
    return res.status(400).json({ error: 'At least two documents are required in the workspace to perform a comparison.' });
  }

  const cacheKey = `compare_${allDocs[0].id}_${allDocs[1].id}`;
  const cached = globalCompareCache.get(cacheKey);
  if (cached) return res.status(200).json(cached);

  const result = compareDocuments(allDocs[0], allDocs[1]);
  globalCompareCache.set(cacheKey, result);
  return res.status(200).json(result);
}
