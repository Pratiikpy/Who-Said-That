"use client";

import { useState, useEffect } from "react";

// ─── Time-of-Day Ambient Theme ──────────────────────────────────────
// Returns ambient gradient colors that shift based on the current time
// of day. Updates every 30 minutes to keep the UI feeling alive without
// excessive re-renders.

type TimePeriod = "morning" | "afternoon" | "evening" | "night";

interface TimeTheme {
  gradientColor: string;
  gradientOpacity: number;
  period: TimePeriod;
}

const THEME_MAP: Record<TimePeriod, { color: string; opacity: number }> = {
  morning: {
    color: "rgba(139, 92, 246, 0.06)",
    opacity: 0.06,
  },
  afternoon: {
    color: "rgba(139, 92, 246, 0.04)",
    opacity: 0.04,
  },
  evening: {
    color: "rgba(100, 80, 220, 0.07)",
    opacity: 0.07,
  },
  night: {
    color: "rgba(80, 60, 180, 0.03)",
    opacity: 0.03,
  },
};

function getPeriod(hour: number): TimePeriod {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 24) return "evening";
  return "night";
}

function resolveTheme(): TimeTheme {
  const hour = new Date().getHours();
  const period = getPeriod(hour);
  const entry = THEME_MAP[period];
  return {
    gradientColor: entry.color,
    gradientOpacity: entry.opacity,
    period,
  };
}

const UPDATE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function useTimeTheme(): TimeTheme {
  const [theme, setTheme] = useState<TimeTheme>(resolveTheme);

  useEffect(() => {
    const id = setInterval(() => {
      setTheme(resolveTheme());
    }, UPDATE_INTERVAL_MS);

    return () => clearInterval(id);
  }, []);

  return theme;
}
