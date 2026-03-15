"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
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
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => search(query), 300);
    } else {
      setResults([]);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  // If a user is selected, show their chip
  if (selected) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface border border-white/[0.08]">
        <img
          src={selected.pfp_url || ""}
          alt={selected.display_name}
          className="w-10 h-10 rounded-full border border-white/10"
          onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{selected.display_name}</p>
          <p className="text-xs text-dim">@{selected.username} · {selected.follower_count.toLocaleString()} followers</p>
        </div>
        <button
          onClick={onClear}
          className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center text-dim hover:text-foreground transition-colors"
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
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dim text-sm">
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
          placeholder="Search Farcaster username..."
          autoCapitalize="none"
          autoComplete="off"
          className="input pl-10"
        />
        {loading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            <span className="w-4 h-4 border-2 border-violet border-t-transparent rounded-full animate-spin inline-block" />
          </span>
        )}
      </div>

      {/* Dropdown results */}
      <AnimatePresence>
        {showDropdown && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 right-0 mt-2 rounded-2xl bg-surface-elevated border border-white/[0.08] overflow-hidden shadow-lg"
            style={{ maxHeight: "280px", overflowY: "auto" }}
          >
            {results.map((user, i) => (
              <button
                key={user.fid}
                onClick={() => {
                  onSelect(user);
                  setQuery("");
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.06] transition-colors text-left touch-target"
              >
                <img
                  src={user.pfp_url || ""}
                  alt={user.display_name}
                  className="w-9 h-9 rounded-full border border-white/10 flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.display_name}</p>
                  <p className="text-xs text-dim truncate">
                    @{user.username} · {user.follower_count.toLocaleString()} followers
                  </p>
                </div>
                {i === 0 && (
                  <span className="text-[11px] text-violet font-medium flex-shrink-0">Top match</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

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
