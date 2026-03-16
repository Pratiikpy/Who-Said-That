"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  {
    title: "Share Your Link",
    description: "Get your anonymous link and share it on Farcaster, Twitter, or anywhere. Friends send you confessions through it.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    title: "Guess Who Sent It",
    description: "Each confession gives you 3 guesses. The sender\u2019s identity is FHE-encrypted \u2014 even the contract can\u2019t see it.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    title: "Buy AI Hints",
    description: "Stuck? Pay a small amount of ETH to unlock AI-generated clues about who sent the confession.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.937 15.5A2 2 0 008.5 14.063l-6.135-1.582a.5.5 0 010-.962L8.5 9.936A2 2 0 009.937 8.5l1.582-6.135a.5.5 0 01.963 0L14.063 8.5A2 2 0 0015.5 9.937l6.135 1.581a.5.5 0 010 .964L15.5 14.063a2 2 0 00-1.437 1.437l-1.582 6.135a.5.5 0 01-.963 0z" />
      </svg>
    ),
  },
];

const STORAGE_KEY = "wst-onboarding-complete";

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show once per device — delay slightly so app renders first
    if (typeof window !== "undefined") {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) {
        // Show after 2 seconds so the user sees the app first
        const timer = setTimeout(() => setVisible(true), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem(STORAGE_KEY, "true");
      setVisible(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <AnimatePresence>
      {visible && (
      <motion.div
        key="onboarding-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end justify-center"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        onClick={handleSkip}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-sm mx-4 mb-8 rounded-2xl p-6 space-y-5"
          style={{ background: "#141416", border: "1px solid #27272A" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: i === step ? "24px" : "8px",
                  background: i === step ? "#8B5CF6" : "#27272A",
                }}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex justify-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.2)" }}
            >
              {current.icon}
            </div>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="text-center space-y-2"
            >
              <h3 className="text-xl font-bold font-display" style={{ color: "#FAFAFA" }}>
                {current.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#A1A1AA" }}>
                {current.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors"
              style={{ color: "#71717A" }}
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="flex-1 btn btn-primary text-sm"
            >
              {step < STEPS.length - 1 ? "Next" : "Get Started"}
            </button>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
