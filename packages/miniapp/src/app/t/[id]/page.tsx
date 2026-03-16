"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase, type DbConfession, type DbThread } from "../../../lib/supabase";
import { getTimeAgo } from "../../../lib/utils";

// ── Inline SVG Icons ──────────────────────────────────────────────

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2L7 9" />
      <path d="M14 2L9.5 14L7 9L2 6.5L14 2z" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="10" cy="10" r="8" strokeOpacity="0.25" />
      <path d="M10 2a8 8 0 016.93 4" strokeLinecap="round" />
    </svg>
  );
}

// ── Public Thread Page ────────────────────────────────────────────
// Accessible without auth. Anyone with the link can view and reply.
// Senders get this link after sending a confession via the share page.

export default function PublicThreadPage() {
  const { id } = useParams<{ id: string }>();
  const [confession, setConfession] = useState<DbConfession | null>(null);
  const [thread, setThread] = useState<DbThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Fetch data ──────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    const [confRes, threadRes] = await Promise.all([
      supabase.from("confessions").select("*").eq("id", id).single(),
      supabase.from("threads").select("*").eq("confession_id", id).order("created_at"),
    ]);

    if (confRes.data) setConfession(confRes.data);
    if (threadRes.data) setThread(threadRes.data);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Realtime subscription ───────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`pub-thread:${id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "threads",
        filter: `confession_id=eq.${id}`,
      }, (payload) => {
        setThread((prev) => [...prev, payload.new as DbThread]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread.length]);

  // ── Send reply as "sender" ──────────────────────────────────────

  const handleReply = async () => {
    const text = reply.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");

    try {
      const res = await fetch(`/api/threads/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderRole: "sender", message: text }),
      });

      if (res.ok) {
        setReply("");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to send");
      }
    } catch {
      setError("Network error. Try again.");
    }
    setSending(false);
  };

  // ── Loading / Not Found ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-dvh bg-void flex items-center justify-center">
        <div className="text-center space-y-3">
          <Spinner />
          <p className="text-sm text-dim">Loading thread...</p>
        </div>
      </div>
    );
  }

  if (!confession) {
    return (
      <div className="min-h-dvh bg-void flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-lg font-display font-semibold">Not Found</p>
          <p className="text-sm text-dim">This confession may have been removed.</p>
          <Link href="/" className="btn btn-primary inline-flex">Go Home</Link>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh bg-void flex flex-col">
      {/* Header */}
      <header className="px-5 py-4 border-b border-border-subtle" style={{ background: "rgba(9, 9, 11, 0.95)" }}>
        <h1 className="text-lg font-display font-bold">Thread</h1>
        <p className="text-xs text-dim mt-0.5">Anonymous conversation</p>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col p-5 space-y-5 overflow-hidden">
        {/* Confession */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-surface-elevated text-dim flex items-center justify-center text-sm font-semibold">
              ?
            </div>
            <div>
              <span className="text-sm font-medium">Your confession</span>
              <span className="text-xs text-dim ml-2">{getTimeAgo(confession.created_at)}</span>
            </div>
          </div>
          <p className="text-base text-foreground leading-relaxed confession-text">
            &ldquo;{confession.message}&rdquo;
          </p>
        </div>

        {/* Thread Messages */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <p className="text-sm font-medium text-muted mb-3">
            {thread.length === 0 ? "No replies yet" : `${thread.length} ${thread.length === 1 ? "reply" : "replies"}`}
          </p>

          {thread.length === 0 ? (
            <div className="card p-6 text-center flex-1 flex items-center justify-center">
              <p className="text-sm text-dim">
                When @{confession.recipient_fid > 0 ? "the recipient" : "they"} reply, it will appear here in real time.
              </p>
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="space-y-2 flex-1 overflow-y-auto"
              style={{ scrollbarWidth: "none" }}
            >
              {thread.map((msg) => {
                const isSender = msg.sender_role === "sender";
                return (
                  <div key={msg.id} className={`flex ${isSender ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        isSender
                          ? "bg-accent text-white rounded-br-md"
                          : "bg-surface border border-border-subtle rounded-bl-md"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[11px] font-medium ${isSender ? "text-white/70" : "text-dim"}`}>
                          {isSender ? "You" : "Them"}
                        </span>
                        <span className={`text-[10px] ${isSender ? "text-white/50" : "text-dim"}`}>
                          {getTimeAgo(msg.created_at)}
                        </span>
                      </div>
                      <p className={`text-[15px] leading-relaxed ${isSender ? "text-white" : "text-foreground"}`}>
                        {msg.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reply Input */}
        <div className="space-y-2">
          {error && (
            <p className="text-xs text-danger text-center">{error}</p>
          )}
          <div className="flex gap-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Reply back anonymously..."
              disabled={sending}
              className="input flex-1"
              maxLength={500}
              onKeyDown={(e) => e.key === "Enter" && handleReply()}
            />
            <button
              onClick={handleReply}
              disabled={!reply.trim() || sending}
              className="btn btn-primary px-4 flex-shrink-0"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {sending ? <Spinner /> : <SendIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="p-5 pt-0">
        <Link href="/">
          <div className="card p-4 text-center">
            <p className="text-sm text-muted">
              Want your own anonymous link?{" "}
              <span className="text-accent font-medium">Get started</span>
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
