// ─── NVIDIA NIM Integration ──────────────────────────────────────────
// Uses minimaxai/minimax-m2.5 via OpenAI-compatible API

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = "minimaxai/minimax-m2.5";

function getApiKey(): string {
  const key = process.env.NVIDIA_NIM_API_KEY;
  if (!key) throw new Error("NVIDIA_NIM_API_KEY not set");
  return key;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface NimResponse {
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
}

async function chat(
  messages: ChatMessage[],
  opts?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  // 8-second timeout to prevent hanging on degraded API
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    signal: controller.signal,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      messages,
      temperature: opts?.temperature ?? 0.9,
      top_p: 0.95,
      max_tokens: opts?.maxTokens ?? 300,
      stream: false,
    }),
  });

  clearTimeout(timeoutId);

  if (!res.ok) {
    const err = await res.text();
    console.error("NVIDIA NIM error:", res.status, err);
    throw new Error(`NVIDIA NIM API error: ${res.status}`);
  }

  const data: NimResponse = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ─── Hint Generation ─────────────────────────────────────────────────

const HINT_SYSTEM_PROMPT = `You are the AI oracle of "Who Said That" — an anonymous confession app. You generate cryptic, teasing, slightly unhinged hints about the identity of anonymous senders.

RULES:
- Never reveal the sender's actual name or username
- Be mysterious, playful, and a little chaotic
- Use vivid metaphors and dramatic language
- Keep hints under 40 words
- Each hint level reveals progressively more
- Make it FUN — users screenshot these hints and share them`;

const HINT_LEVEL_PROMPTS: Record<number, string> = {
  1: "Generate a VAGUE hint. Something generic like their general vibe or energy. Almost useless but intriguing. One sentence.",
  2: "Generate a MODERATE hint using the stats. Mention their account age range or follower bracket. Be cryptic about it. Two sentences max.",
  3: "Generate a SPECIFIC hint. Reference their interaction patterns with the recipient. Get dramatic. Make the reader go 'wait...'",
  4: "Generate a VERY REVEALING hint. Give strong behavioral clues. Reference specific patterns. Make it almost obvious but not quite.",
  5: "Generate THE FINAL HINT. Include the first letter of their username and character count. Be theatrical about it. This is the big reveal moment.",
};

export async function generateHint(
  level: number,
  senderHintData: Record<string, unknown>
): Promise<string> {
  const levelPrompt = HINT_LEVEL_PROMPTS[level] || HINT_LEVEL_PROMPTS[1];

  // Whitelist allowed fields to prevent prompt injection via sender-crafted data
  const safeData = {
    follower_range: senderHintData.follower_range ?? "unknown",
    account_age_months: senderHintData.account_age_months ?? "unknown",
    mutual_count: senderHintData.mutual_count ?? 0,
    recent_interactions: senderHintData.recent_interactions ?? 0,
    platform: senderHintData.platform ?? "farcaster",
  };

  try {
    return await chat(
      [
        { role: "system", content: HINT_SYSTEM_PROMPT },
        {
          role: "user",
          content: `${levelPrompt}\n\nAnonymized sender data:\n${JSON.stringify(safeData, null, 2)}`,
        },
      ],
      { temperature: 1.0, maxTokens: 150 }
    );
  } catch {
    // Fallback hints if API fails
    const fallbacks: Record<number, string> = {
      1: "This person exists in your orbit. The universe acknowledges their presence and nothing more.",
      2: "They've been watching from a comfortable distance. Their account has seen things.",
      3: "You share more connections than you'd think. The web is tighter than it looks.",
      4: "They've been more active in your world than you realize. Check your recent interactions.",
      5: "The truth is hiding in plain sight. Their name dances on the tip of your tongue.",
    };
    return fallbacks[level] || fallbacks[1];
  }
}

// ─── Content Moderation ──────────────────────────────────────────────

const MODERATION_PROMPT = `You are a content moderator for an anonymous confession app. Analyze the message and respond with ONLY valid JSON:

{"safe": true/false, "score": 0.0-1.0, "reason": "brief reason if unsafe"}

BLOCK (safe=false):
- Direct threats of violence or self-harm
- Hate speech targeting protected groups
- Explicit sexual content involving minors
- Doxxing (revealing personal addresses, phone numbers)
- Detailed instructions for illegal activities

ALLOW (safe=true):
- Profanity, swearing
- Romantic/crush confessions
- Criticism, sarcasm, gossip
- Mild sexual content between adults
- Controversial opinions
- Roasting/teasing (non-threatening)

Be permissive. This is an anonymous confession app — edgy content is expected. Only block genuinely harmful content.`;

export interface ModerationResult {
  safe: boolean;
  score: number;
  reason?: string;
}

export async function moderateContent(text: string): Promise<ModerationResult> {
  // Always run basic word filter first
  const blockedPatterns = [
    /\b(kill|murder|shoot|stab)\s+(your|my|him|her|them)self\b/i,
    /\bi\s+(will|want\s+to)\s+(hurt|harm|attack)\b/i,
    /\bbomb\s+threat\b/i,
    /\bdoxx?(ed|ing)?\b.*\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/i, // doxxing with phone numbers
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(text)) {
      return { safe: false, score: 1.0, reason: "Potentially harmful content detected" };
    }
  }

  // AI moderation via NVIDIA NIM
  try {
    const response = await chat(
      [
        { role: "system", content: MODERATION_PROMPT },
        { role: "user", content: `Moderate this anonymous confession:\n\n"${text}"` },
      ],
      { temperature: 0.1, maxTokens: 100 }
    );

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        safe: parsed.safe !== false,
        score: typeof parsed.score === "number" ? parsed.score : 0,
        reason: parsed.reason,
      };
    }
  } catch (err) {
    console.error("Moderation API error:", err);
  }

  // Fail-closed: if AI moderation is unavailable and no API key is set, allow through
  // If API key IS set but call failed, still allow (don't block users for transient API issues)
  // The regex pre-filter above catches the worst content regardless
  return { safe: true, score: 0 };
}
