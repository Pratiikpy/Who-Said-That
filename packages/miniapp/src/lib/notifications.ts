import { createServerSupabase } from "./supabase";

/**
 * Send a Farcaster Mini App push notification to a user.
 *
 * Looks up the recipient's notification token in Supabase and POSTs to the
 * Farcaster client's notification endpoint.
 *
 * Fails silently when:
 *  - recipientFid is 0 or falsy (unknown recipient)
 *  - no notification token is stored for the recipient
 *  - the Farcaster notification server returns an error
 */
export async function sendNotification(
  recipientFid: number,
  title: string,
  body: string,
  targetUrl: string
): Promise<void> {
  try {
    if (!recipientFid) return;

    const supabase = createServerSupabase();

    const { data: tokenRow, error: queryError } = await supabase
      .from("notification_tokens")
      .select("token, url")
      .eq("fid", recipientFid)
      .maybeSingle();

    if (queryError) {
      console.error("Failed to query notification token:", queryError);
      return;
    }

    if (!tokenRow?.token || !tokenRow?.url) {
      // Recipient has not enabled notifications — nothing to do
      return;
    }

    // Build a stable notificationId so the same event is deduplicated by
    // the Farcaster client over its 24-hour window.
    const notificationId = `confession-${recipientFid}-${Date.now()}`;

    const response = await fetch(tokenRow.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notificationId,
        title: title.slice(0, 32),
        body: body.slice(0, 128),
        targetUrl,
        tokens: [tokenRow.token],
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(
        `Notification send failed (${response.status}):`,
        text
      );
      return;
    }

    const result = await response.json().catch(() => null);

    // If the token was reported as invalid, clean it up
    if (result?.result?.invalidTokens?.includes(tokenRow.token)) {
      await supabase
        .from("notification_tokens")
        .delete()
        .eq("fid", recipientFid)
        .eq("token", tokenRow.token);
      console.warn(
        `Removed invalid notification token for fid ${recipientFid}`
      );
    }
  } catch (err) {
    // Never let notification failures break the calling flow
    console.error("sendNotification error:", err);
  }
}
