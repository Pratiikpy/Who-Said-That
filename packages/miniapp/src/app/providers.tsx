"use client";
import { ReactNode, useState } from "react";
import { baseSepolia } from "wagmi/chains";
import "@coinbase/onchainkit/styles.css";
import { createConfig, WagmiProvider, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Safely import MiniKit — might fail outside Farcaster context
let MiniKitProviderComponent: React.ComponentType<Record<string, unknown> & { children: ReactNode }> | null = null;
let miniAppConnector: ReturnType<typeof import("@farcaster/miniapp-wagmi-connector").farcasterMiniApp> | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const minikit = require("@coinbase/onchainkit/minikit");
  MiniKitProviderComponent = minikit.MiniKitProvider;
} catch {
  // Running outside MiniKit context
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const connector = require("@farcaster/miniapp-wagmi-connector");
  miniAppConnector = connector.farcasterMiniApp();
} catch {
  // Running outside Farcaster context
}

const connectors = [
  ...(miniAppConnector ? [miniAppConnector] : []),
  injected(),
];

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors,
  ssr: true,
  multiInjectedProviderDiscovery: false,
  transports: {
    [baseSepolia.id]: http(),
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  const content = (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );

  // Wrap with MiniKitProvider if available
  if (MiniKitProviderComponent) {
    return (
      <MiniKitProviderComponent
        chain={baseSepolia}
        apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY || ""}
        config={{
          appearance: { mode: "dark" },
          wallet: {
            display: "modal",
            preference: "eoaOnly",
            supportedWallets: { rabby: true, trust: true },
          },
        }}
      >
        {content}
      </MiniKitProviderComponent>
    );
  }

  return content;
}
