const STORAGE_KEY = "wst-sound-muted";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = true; // default muted (opt-in)

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      this.muted = stored === null ? true : stored === "true";
    }
  }

  // ── Lazy AudioContext ──────────────────────────────────────────────

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;

    if (!this.ctx) {
      this.ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    }

    // Resume if suspended (mobile browser policy).
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  // ── Mute Control ───────────────────────────────────────────────────

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, String(muted));
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  // ── Primitive: play a tone ─────────────────────────────────────────

  private playTone(
    frequency: number,
    durationMs: number,
    volume: number,
    type: OscillatorType = "sine",
    startOffsetMs: number = 0
  ): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;

    const startTime = ctx.currentTime + startOffsetMs / 1000;
    const endTime = startTime + durationMs / 1000;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.005); // 5ms attack
    gain.gain.setValueAtTime(volume, endTime - 0.01);
    gain.gain.linearRampToValueAtTime(0, endTime); // clean release

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(endTime + 0.01);
  }

  // ── Sound Methods ──────────────────────────────────────────────────

  /** Short tap feedback — 880Hz sine, 40ms, 15% volume */
  tap(): void {
    this.playTone(880, 40, 0.15);
  }

  /** Compose focus — ascending A4 -> C#5, triangle wave, 60ms each */
  composeFocus(): void {
    this.playTone(440, 60, 0.15, "triangle", 0);
    this.playTone(554, 60, 0.15, "triangle", 50); // slight overlap
  }

  /** Send confirm — ascending C#5 -> E5 -> A5, 80ms each, slight overlap */
  sendConfirm(): void {
    this.playTone(554, 80, 0.15, "sine", 0);
    this.playTone(659, 80, 0.15, "sine", 60);
    this.playTone(880, 80, 0.15, "sine", 120);
  }

  /** Wrong guess — 220Hz sine, 150ms, 20% volume */
  wrongGuess(): void {
    this.playTone(220, 150, 0.2);
  }

  /** Reveal — ascending arpeggio A4 -> C#5 -> E5 -> A5, crescendo, sustained chord */
  reveal(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    // Arpeggio: 100ms each with overlap, crescendo 15% -> 35%
    const notes = [440, 554, 659, 880];
    const volumes = [0.15, 0.2, 0.27, 0.35];

    notes.forEach((freq, i) => {
      this.playTone(freq, 100, volumes[i], "sine", i * 80);
    });

    // Sustained chord after arpeggio — all four notes together for 600ms
    const chordStart = notes.length * 80;
    notes.forEach((freq, i) => {
      this.playTone(freq, 600, volumes[i] * 0.6, "sine", chordStart);

      // Also add a quiet triangle harmonic for warmth
      if (i > 0) {
        this.playTone(freq, 600, volumes[i] * 0.2, "triangle", chordStart);
      }
    });
  }

  /** Hint unlocked — 1047Hz (C6) chime, 80ms, 20% volume */
  hintUnlocked(): void {
    this.playTone(1047, 80, 0.2);
  }

  /** New confession — descending A5 -> E5, 60ms each */
  newConfession(): void {
    this.playTone(880, 60, 0.15, "sine", 0);
    this.playTone(659, 60, 0.15, "sine", 50);
  }
}

export const sound = new SoundEngine();
