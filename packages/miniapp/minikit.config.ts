const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const minikitConfig = {
  accountAssociation: {
    header: "",
    payload: "",
    signature: "",
  },
  miniapp: {
    version: "1",
    name: "Who Said That",
    subtitle: "Anonymous encrypted confessions",
    description:
      "Send anonymous confessions encrypted with FHE. Recipients guess who sent them with AI hints.",
    screenshotUrls: [] as string[],
    iconUrl: `${ROOT_URL}/icon.png`,
    splashImageUrl: `${ROOT_URL}/splash.png`,
    splashBackgroundColor: "#0D0B14",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "social",
    tags: ["anonymous", "confessions", "fhe", "encryption", "social", "ai"],
    heroImageUrl: `${ROOT_URL}/og.png`,
    tagline: "Who sent this?",
    ogTitle: "Who Said That",
    ogDescription:
      "Anonymous encrypted confessions on Base. Guess who sent them.",
    ogImageUrl: `${ROOT_URL}/og.png`,
  },
} as const;
