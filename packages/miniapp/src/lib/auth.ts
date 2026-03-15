import { NextRequest, NextResponse } from "next/server";

/**
 * JWT Auth Middleware for API routes.
 *
 * Verifies the Farcaster Quick Auth JWT from the Authorization header.
 * Returns the authenticated user's FID if valid, or a 401 response if not.
 *
 * Usage in API routes:
 * ```ts
 * const auth = await verifyAuth(request);
 * if (auth.error) return auth.error;
 * const userFid = auth.fid;
 * ```
 */

interface AuthSuccess {
  fid: number;
  error: null;
}

interface AuthFailure {
  fid: null;
  error: NextResponse;
}

type AuthResult = AuthSuccess | AuthFailure;

export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      fid: null,
      error: NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  try {
    // Verify using Farcaster Quick Auth
    const { createClient } = await import("@farcaster/quick-auth");
    const quickAuthClient = createClient();

    // Determine the app's domain
    const host = request.headers.get("host") || "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const domain = `${proto}://${host}`;

    const payload = await quickAuthClient.verifyJwt({
      token,
      domain,
    });

    const fid = (payload as Record<string, unknown>)?.fid as number | undefined;
    if (!fid) {
      return {
        fid: null,
        error: NextResponse.json(
          { error: "Invalid token: no FID found" },
          { status: 401 }
        ),
      };
    }

    return { fid, error: null };
  } catch {
    return {
      fid: null,
      error: NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      ),
    };
  }
}

/**
 * Simple IP-based rate limiter using in-memory store.
 * For production, use Upstash Redis or Vercel KV instead.
 *
 * Returns true if the request should be BLOCKED (rate exceeded).
 */

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(
  request: NextRequest,
  maxRequests: number = 30,
  windowMs: number = 60_000
): boolean {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  const now = Date.now();
  const key = ip;

  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return true; // BLOCKED
  }

  return false;
}

/**
 * Rate limit response helper
 */
export function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429 }
  );
}

// Clean up expired rate limit entries every 5 minutes
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      if (now > entry.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, 300_000);
}
