"use client";

/**
 * Authenticated fetch wrapper.
 * Adds the Farcaster Quick Auth JWT token to API requests.
 *
 * Usage:
 *   const res = await authFetch("/api/reactions", { method: "POST", body: ... });
 */

let cachedToken: string | null = null;

async function getAuthToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;

  try {
    const mod = await import("@farcaster/miniapp-sdk");
    const sdk = mod.sdk || mod.default;

    if (!sdk?.quickAuth) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await sdk.quickAuth.getToken();
    const token: string | null = typeof result === "string" ? result : result?.token ?? null;
    if (token) {
      cachedToken = token;
      setTimeout(() => { cachedToken = null; }, 240_000);
      return token;
    }
  } catch {
    // Not in Farcaster context or Quick Auth unavailable
  }

  return null;
}

export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();

  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  headers.set("Content-Type", "application/json");

  return fetch(url, {
    ...options,
    headers,
  });
}
