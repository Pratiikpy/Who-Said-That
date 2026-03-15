"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useHaptics } from "../hooks/useHaptics";

// ─── Inline SVG Icons ────────────────────────────────────────────────

function InboxIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "#FAFAFA" : "#71717A"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="M22 7L13.03 12.7a2 2 0 01-2.06 0L2 7" />
    </svg>
  );
}

function FeedIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "#FAFAFA" : "#71717A"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function ComposeIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function RoomsIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "#FAFAFA" : "#71717A"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="7" r="4" />
      <path d="M1 21v-2a4 4 0 014-4h8a4 4 0 014 4v2" />
      <path d="M16 3.13a4 4 0 010 7.75" />
      <path d="M21 21v-2a4 4 0 00-3-3.87" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? "#FAFAFA" : "#71717A"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 10-16 0" />
    </svg>
  );
}

// ─── Tab Configuration ───────────────────────────────────────────────

interface Tab {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
  childPrefixes?: string[];
  isCompose?: boolean;
}

const tabs: Tab[] = [
  {
    href: "/app",
    label: "Inbox",
    icon: (active) => <InboxIcon active={active} />,
    childPrefixes: ["/app/c/"],
  },
  {
    href: "/app/feed",
    label: "Feed",
    icon: (active) => <FeedIcon active={active} />,
  },
  {
    href: "/app/compose",
    label: "Compose",
    icon: () => <ComposeIcon />,
    isCompose: true,
  },
  {
    href: "/app/rooms",
    label: "Rooms",
    icon: (active) => <RoomsIcon active={active} />,
  },
  {
    href: "/app/me",
    label: "Profile",
    icon: (active) => <ProfileIcon active={active} />,
  },
];

// ─── Component ───────────────────────────────────────────────────────

export function BottomTabs() {
  const pathname = usePathname();
  const { select } = useHaptics();

  function isTabActive(tab: Tab): boolean {
    if (tab.isCompose) return pathname === tab.href;
    if (tab.href === "/app") {
      return (
        pathname === "/app" ||
        (tab.childPrefixes?.some((p) => pathname.startsWith(p)) ?? false)
      );
    }
    return pathname.startsWith(tab.href);
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-subtle"
      style={{ background: "rgba(9, 9, 11, 0.92)", backdropFilter: "blur(20px)" }}
    >
      <div className="flex items-end justify-around px-2 pb-[env(safe-area-inset-bottom,0px)]">
        {tabs.map((tab) => {
          const active = isTabActive(tab);

          // ── Center Compose Button ──
          if (tab.isCompose) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => select()}
                className="flex flex-col items-center -mt-3 pt-0"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <motion.div
                  whileTap={{ scale: 0.88 }}
                  className="w-[48px] h-[48px] rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
                    boxShadow: "0 4px 24px rgba(139, 92, 246, 0.35)",
                  }}
                >
                  <ComposeIcon />
                </motion.div>
                <span className="text-[11px] mt-1 font-medium text-dim">
                  {tab.label}
                </span>
              </Link>
            );
          }

          // ── Regular Tabs ──
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => select()}
              className="relative flex flex-col items-center pt-2 pb-1.5 min-w-[56px] min-h-[48px]"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {/* Active indicator bar */}
              {active && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute top-0 w-8 h-[2px] rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}

              <motion.div
                whileTap={{ scale: 0.88 }}
                className="flex flex-col items-center gap-0.5"
              >
                {tab.icon(active)}
                <span
                  className="text-[11px] font-medium"
                  style={{ color: active ? "#FAFAFA" : "#71717A" }}
                >
                  {tab.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
