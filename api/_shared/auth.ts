// Optional server-side Firebase auth verification for the /api routes.
//
// Activation is OPT-IN via the FIREBASE_SERVICE_ACCOUNT env var (a JSON service
// account key, or base64 of it). When it's set, requireAuth() verifies the
// caller's Firebase ID token (sent as `Authorization: Bearer <token>`) and
// rejects anonymous/invalid callers. When it's NOT set, verification is
// INACTIVE and requests pass through unchecked (so local dev and the
// guest-mode flow keep working until you wire credentials). See AUTH_SETUP.md.

import type { VercelRequest, VercelResponse } from '@vercel/node';

let adminAuthPromise: Promise<unknown> | null = null;

function parseServiceAccount(raw: string): Record<string, unknown> | null {
  try {
    // Accept raw JSON or base64-encoded JSON.
    const json = raw.trim().startsWith('{')
      ? raw
      : Buffer.from(raw, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Lazily initialize the Admin SDK only when configured. Imported dynamically so
// the dependency isn't pulled in (or required) when verification is inactive.
async function getAdminAuth(): Promise<{
  verifyIdToken: (t: string) => Promise<{ uid: string; email?: string }>;
} | null> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;

  if (!adminAuthPromise) {
    adminAuthPromise = (async () => {
      const creds = parseServiceAccount(raw);
      if (!creds) throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
      const admin = await import('firebase-admin');
      if (admin.apps.length === 0) {
        admin.initializeApp({ credential: admin.credential.cert(creds as never) });
      }
      return admin.auth();
    })();
  }
  return adminAuthPromise as Promise<{
    verifyIdToken: (t: string) => Promise<{ uid: string; email?: string }>;
  }>;
}

export interface AuthedUser {
  uid: string;
  email?: string;
}

/**
 * Returns true to CONTINUE, false if it already sent a 401 (caller should stop).
 * Inactive (returns true immediately) until FIREBASE_SERVICE_ACCOUNT is set.
 */
export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse,
): Promise<boolean> {
  let adminAuth: Awaited<ReturnType<typeof getAdminAuth>>;
  try {
    adminAuth = await getAdminAuth();
  } catch (err) {
    console.error('[auth] admin init failed:', err);
    // Misconfigured credentials: fail closed.
    res.status(500).json({ error: 'SERVER_MISCONFIGURED' });
    return false;
  }

  // Verification not configured -> inactive, allow through.
  if (!adminAuth) return true;

  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return false;
  }

  try {
    await adminAuth.verifyIdToken(token);
    return true;
  } catch {
    res.status(401).json({ error: 'UNAUTHENTICATED' });
    return false;
  }
}
