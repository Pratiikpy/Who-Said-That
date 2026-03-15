"use client";

import { motion } from "framer-motion";

function UsersIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4" />
      <path d="M1 21v-2a4 4 0 014-4h8a4 4 0 014 4v2" />
      <path d="M16 3.13a4 4 0 010 7.75" />
      <path d="M21 21v-2a4 4 0 00-3-3.87" />
    </svg>
  );
}

export default function RoomsPage() {
  return (
    <div className="px-5 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-display text-foreground">Rooms</h2>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center py-20"
      >
        <div className="w-20 h-20 mx-auto rounded-3xl bg-surface border border-border-subtle flex items-center justify-center mb-5">
          <UsersIcon />
        </div>
        <h3 className="text-lg font-semibold font-display text-foreground mb-2">Coming Soon</h3>
        <p className="text-sm text-dim max-w-[280px] mx-auto leading-relaxed">
          Anonymous group chats where FHE proves you&rsquo;re a member without revealing which member you are.
        </p>
      </motion.div>
    </div>
  );
}
