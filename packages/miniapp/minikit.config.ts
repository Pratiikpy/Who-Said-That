const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const minikitConfig = {
  accountAssociation: {
    header: "eyJmaWQiOjExNDg5NzEsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgwMTMwOTViRDIzM2U1ZDgzQzY1NTA3NjVhMUVjRDkzYzMzNDFCNEQ1In0",
    payload: "eyJkb21haW4iOiJ3aG8tc2FpZC10aGF0LW9ycGluLnZlcmNlbC5hcHAifQ",
    signature: "aPaLxs0VcUDElYCtQqkAlvpGlYSl/oNU0GQF8+PH4AtC2+XrX2R1oniNKkriBdBXJaZpfYlE0ivzLQLnSoyRBRw=",
  },
  miniapp: {
    version: "1",
    name: "Who Said That",
    subtitle: "Anonymous confessions on Base",
    description:
      "Send anonymous confessions encrypted with FHE. Recipients guess who sent them with AI hints.",
    screenshotUrls: [] as string[],
    iconUrl: `${ROOT_URL}/icon.png`,
    splashImageUrl: `${ROOT_URL}/api/splash`,
    splashBackgroundColor: "#0D0B14",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "social",
    tags: ["anonymous", "confessions", "fhe", "social", "ai"],
    heroImageUrl: `${ROOT_URL}/api/og`,
    tagline: "Who sent this?",
    ogTitle: "Who Said That",
    ogDescription:
      "Anonymous encrypted confessions on Base. Guess who sent them.",
    ogImageUrl: `${ROOT_URL}/api/og`,
  },
} as const;
