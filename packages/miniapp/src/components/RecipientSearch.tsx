"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { FarcasterUser } from "../lib/neynar";

interface RecipientSearchProps {
  onSelect: (user: FarcasterUser) => void;
  selected: FarcasterUser | null;
  onClear: () => void;
}

export function RecipientSearch({ onSelect, selected, onClear }: RecipientSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FarcasterUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.users || []);
    } catch {
      setResults([]);
    }
    setLoading(false);
    setSearched(true);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => search(query), 300);
    } else {
      setResults([]);
      setSearched(false);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  // Allow using typed username directly when search returns no results
  const handleUseTypedUsername = () => {
    const username = query.trim().replace(/^@/, "");
    if (username.length < 2) return;
    onSelect({
      fid: 0, // Will be resolved server-side
      username,
      display_name: username,
      pfp_url: "",
      follower_count: 0,
      following_count: 0,
    });
    setQuery("");
    setShowDropdown(false);
  };

  // If a user is selected, show their chip
  if (selected) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface border border-border">
        {selected.pfp_url ? (
          <img
            src={selected.pfp_url}
            alt={selected.display_name}
            className="w-10 h-10 rounded-full border border-border"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M20 21a8 8 0 10-16 0" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {selected.display_name}
          </p>
          <p className="text-xs text-dim">
            @{selected.username}
            {selected.follower_count > 0 && ` · ${selected.follower_count.toLocaleString()} followers`}
          </p>
        </div>
        <button
          onClick={onClear}
          className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center text-dim active:text-foreground transition-colors"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Search input */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dim">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value.replace("@", ""));
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Type a Farcaster username..."
          autoCapitalize="none"
          autoComplete="off"
          className="input pl-10"
        />
        {loading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block" />
          </span>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 left-0 right-0 mt-2 rounded-2xl bg-surface-elevated border border-border overflow-hidden shadow-elevated" style={{ maxHeight: "320px", overflowY: "auto" }}>
          {/* Search results */}
          {results.map((user, i) => (
            <button
              key={user.fid}
              onClick={() => {
                onSelect(user);
                setQuery("");
                setShowDropdown(false);
              }}
              className="w-full flex items-center gap-3 p-3 active:bg-glass-hover transition-colors text-left"
              style={{ WebkitTapHighlightColor: "transparent", minHeight: "52px" }}
            >
              <img
                src={user.pfp_url || ""}
                alt={user.display_name}
                className="w-9 h-9 rounded-full border border-border flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.display_name}</p>
                <p className="text-xs text-dim truncate">@{user.username} · {user.follower_count.toLocaleString()} followers</p>
              </div>
              {i === 0 && (
                <span className="text-[11px] text-accent font-medium flex-shrink-0">Match</span>
              )}
            </button>
          ))}

          {/* "Use this username" fallback when no results */}
          {searched && results.length === 0 && query.length >= 2 && (
            <button
              onClick={handleUseTypedUsername}
              className="w-full flex items-center gap-3 p-4 active:bg-glass-hover transition-colors text-left"
              style={{ WebkitTapHighlightColor: "transparent", minHeight: "52px" }}
            >
              <div className="w-9 h-9 rounded-full bg-accent-muted flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M20 21a8 8 0 10-16 0" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Send to @{query}
                </p>
                <p className="text-xs text-dim">
                  Use this username even if not found
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent flex-shrink-0">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          )}

          {/* Hint when typing */}
          {!searched && query.length > 0 && query.length < 2 && (
            <div className="p-4 text-center">
              <p className="text-xs text-dim">Type at least 2 characters</p>
            </div>
          )}
        </div>
      )}

      {/* Close dropdown on outside click */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
