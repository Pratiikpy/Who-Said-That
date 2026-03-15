import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

// Farcaster Mini App webhook handler with signature verification
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Verify webhook signature using @farcaster/miniapp-node
    let verifiedData: { fid: number; event: string; token?: string; url?: string; appFid?: number };

    try {
      const { parseWebhookEvent, verifyAppKeyWithNeynar } = await import("@farcaster/miniapp-node");

      // verifyAppKeyWithNeynar reads NEYNAR_API_KEY from env internally
      const parsedBody = JSON.parse(body);

      const data = await parseWebhookEvent(parsedBody, verifyAppKeyWithNeynar);

      // Extract verified fields
      // parseWebhookEvent returns { fid, appFid, event: { event, notificationDetails? } }
      verifiedData = {
        event: data.event.event,
        fid: data.fid,
        appFid: data.appFid,
        token: "notificationDetails" in data.event ? (data.event as { notificationDetails?: { token: string; url: string } }).notificationDetails?.token : undefined,
        url: "notificationDetails" in data.event ? (data.event as { notificationDetails?: { token: string; url: string } }).notificationDetails?.url : undefined,
      };
    } catch (verifyErr) {
      console.error("Webhook verification failed:", verifyErr);
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const { event, fid, token, url, appFid } = verifiedData;

    if (!event || !fid) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    const supabase = createServerSupabase();

    switch (event) {
      case "miniapp_added":
      case "notifications_enabled": {
        if (token && url) {
          await supabase.from("notification_tokens").upsert(
            {
              fid,
              app_fid: appFid || 0,
              token,
              url,
            },
            { onConflict: "fid,app_fid" }
          );
        }
        break;
      }

      case "miniapp_removed":
      case "notifications_disabled": {
        await supabase
          .from("notification_tokens")
          .delete()
          .eq("fid", fid);
        break;
      }

      default:
        // Unknown event type — ignore
        break;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
