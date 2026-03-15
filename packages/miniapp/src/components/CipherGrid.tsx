"use client";

import { useEffect, useRef, useCallback } from "react";

const CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!?";
const GRID_SPACING = 18;
const FONT = "13px monospace";
const MIN_CYCLE_MS = 2000;
const MAX_CYCLE_MS = 4000;

interface Cell {
  char: string;
  nextSwap: number; // timestamp when this cell should swap
  dirty: boolean;
}

interface CipherGridProps {
  /** Tint color for the characters. Default: rgba(139, 92, 246, 0.035) */
  color?: string;
}

function randomChar(): string {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

function randomCycleDelay(): number {
  return MIN_CYCLE_MS + Math.random() * (MAX_CYCLE_MS - MIN_CYCLE_MS);
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function CipherGrid({
  color = "rgba(139, 92, 246, 0.035)",
}: CipherGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cellsRef = useRef<Cell[][]>([]);
  const rafRef = useRef<number>(0);
  const colsRef = useRef(0);
  const rowsRef = useRef(0);
  const reducedMotionRef = useRef(false);

  // Build or rebuild the cell grid for the current viewport size.
  const buildGrid = useCallback((width: number, height: number): void => {
    const cols = Math.ceil(width / GRID_SPACING) + 1;
    const rows = Math.ceil(height / GRID_SPACING) + 1;
    const now = performance.now();

    const grid: Cell[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < cols; c++) {
        // Reuse existing cell if it still falls within bounds
        const existing = cellsRef.current[r]?.[c];
        if (existing) {
          existing.dirty = true; // force redraw after resize
          row.push(existing);
        } else {
          row.push({
            char: randomChar(),
            nextSwap: now + randomCycleDelay(),
            dirty: true,
          });
        }
      }
      grid.push(row);
    }

    cellsRef.current = grid;
    colsRef.current = cols;
    rowsRef.current = rows;
  }, []);

  // Draw a single cell to the canvas context.
  const drawCell = useCallback(
    (ctx: CanvasRenderingContext2D, col: number, row: number, cell: Cell) => {
      const x = col * GRID_SPACING;
      const y = row * GRID_SPACING;

      // Clear the cell region
      ctx.clearRect(x - 1, y - GRID_SPACING + 2, GRID_SPACING, GRID_SPACING);

      // Draw the character
      ctx.fillText(cell.char, x, y);
    },
    []
  );

  // Full redraw — used after resize or initial mount.
  const fullDraw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const rows = rowsRef.current;
      const cols = colsRef.current;
      const grid = cellsRef.current;

      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.font = FONT;
      ctx.fillStyle = color;
      ctx.textBaseline = "alphabetic";

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = grid[r][c];
          drawCell(ctx, c, r, cell);
          cell.dirty = false;
        }
      }
    },
    [color, drawCell]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    reducedMotionRef.current = prefersReducedMotion();

    // Size the canvas to fill the viewport.
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      buildGrid(w, h);
      fullDraw(ctx);
    };

    resize();

    // Listen for viewport changes.
    window.addEventListener("resize", resize);

    // Listen for reduced-motion preference changes.
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    motionMq.addEventListener("change", onMotionChange);

    // If the user prefers reduced motion, we drew a static grid already — stop.
    if (reducedMotionRef.current) {
      return () => {
        window.removeEventListener("resize", resize);
        motionMq.removeEventListener("change", onMotionChange);
      };
    }

    // Animation loop — only updates dirty cells.
    const tick = () => {
      const now = performance.now();
      const grid = cellsRef.current;
      const rows = rowsRef.current;
      const cols = colsRef.current;

      if (reducedMotionRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      ctx.font = FONT;
      ctx.fillStyle = color;
      ctx.textBaseline = "alphabetic";

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = grid[r][c];
          if (now >= cell.nextSwap) {
            cell.char = randomChar();
            cell.nextSwap = now + randomCycleDelay();
            cell.dirty = true;
          }
          if (cell.dirty) {
            drawCell(ctx, c, r, cell);
            cell.dirty = false;
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      motionMq.removeEventListener("change", onMotionChange);
    };
  }, [color, buildGrid, fullDraw, drawCell]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        width: "100vw",
        height: "100vh",
      }}
    />
  );
}
