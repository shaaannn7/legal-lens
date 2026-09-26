import type { NextApiRequest, NextApiResponse } from 'next';

// Simple in-memory rate limiting store
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Checks and enforces API rate limiting per IP address.
 * Returns true if request is allowed, false if rate limit exceeded.
 */
export function checkRateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  limit = 40,
  windowMs = 60 * 1000,
): boolean {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    '127.0.0.1';

  const now = Date.now();
  const record = rateLimitMap.get(ip);

  // Set standard security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', (limit - 1).toString());
    return true;
  }

  if (record.count >= limit) {
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000).toString());
    res.status(429).json({ error: 'Rate limit exceeded. Please try again shortly.' } as any);
    return false;
  }

  record.count += 1;
  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Remaining', (limit - record.count).toString());
  return true;
}

/**
 * Sanitizes generic string inputs to prevent XSS.
 */
export function sanitizeInput(input: string, maxLength = 2000): string {
  if (typeof input !== 'string') return '';
  return input
    .slice(0, maxLength)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Sanitizes user prompts to mitigate Prompt Injection attacks.
 */
export function sanitizePromptInput(prompt: string): string {
  let clean = sanitizeInput(prompt, 2000);
  
  // Neutralize common prompt injection directives
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|system)/gi,
    /disregard\s+(all\s+)?(previous|prior|above)/gi,
    /you\s+are\s+now\s+(a|an)?\s*(DAN|unrestricted|god\s+mode)/gi,
    /system\s*:\s*/gi,
  ];

  for (const pattern of injectionPatterns) {
    clean = clean.replace(pattern, '[filtered pattern]');
  }

  return clean;
}
