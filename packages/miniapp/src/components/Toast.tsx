"use client";

import { useState, useCallback, useMemo, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  toast: (message: string, type?: ToastItem["type"]) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

// SVG icons for toast types (no Unicode symbols)
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 8 7 12 13 4" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="4" x2="12" y2="12" />
      <line x1="12" y1="4" x2="4" y2="12" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <line x1="8" y1="7" x2="8" y2="11" />
      <line x1="8" y1="5" x2="8.01" y2="5" />
    </svg>
  );
}

const TOAST_ICONS: Record<ToastItem["type"], () => React.JSX.Element> = {
  success: CheckIcon,
  error: XIcon,
  info: InfoIcon,
};

// Using inline styles for colors to avoid undefined Tailwind classes
const TOAST_STYLES: Record<ToastItem["type"], React.CSSProperties> = {
  success: { background: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.25)", color: "#4ADE80" },
  error: { background: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.25)", color: "#EF4444" },
  info: { background: "rgba(139,92,246,0.12)", borderColor: "rgba(139,92,246,0.25)", color: "#A78BFA" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastItem["type"] = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  const value = useMemo(() => ({ toast: addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="fixed top-4 left-4 right-4 z-[100] flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = TOAST_ICONS[t.type];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="px-4 py-2.5 rounded-xl border text-sm font-medium flex items-center gap-2 shadow-lg pointer-events-auto"
                style={{ ...TOAST_STYLES[t.type], backdropFilter: "blur(20px)" }}
              >
                <Icon />
                {t.message}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
