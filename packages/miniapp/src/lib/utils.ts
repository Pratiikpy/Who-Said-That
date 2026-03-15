// ─── Shared Utilities ─────────────────────────────────────────────────

export function getTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen).trimEnd() + "...";
}

export function formatEth(wei: number | bigint): string {
  const eth = Number(wei) / 1e18;
  if (eth < 0.001) return `${(eth * 1000).toFixed(2)} mETH`;
  return `${eth.toFixed(4)} ETH`;
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function classNames(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Generate a deterministic random alias for whisper rooms
const ANIMALS = [
  "Fox", "Owl", "Wolf", "Bear", "Hawk", "Lynx", "Crow", "Deer",
  "Hare", "Moth", "Seal", "Dove", "Swan", "Orca", "Puma", "Newt",
];
const ADJECTIVES = [
  "Silent", "Midnight", "Phantom", "Shadow", "Ghost", "Mystic",
  "Velvet", "Cosmic", "Neon", "Hollow", "Fading", "Secret",
];

export function randomAlias(seed?: string): string {
  const hash = seed
    ? seed.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
    : Math.floor(Math.random() * 10000);
  const adj = ADJECTIVES[Math.abs(hash) % ADJECTIVES.length];
  const animal = ANIMALS[Math.abs(hash >> 4) % ANIMALS.length];
  return `${adj} ${animal}`;
}
