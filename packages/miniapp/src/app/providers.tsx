"use client";
import { ReactNode } from "react";
import { baseSepolia } from "wagmi/chains";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import "@coinbase/onchainkit/styles.css";

// MiniKitProvider internally creates its own WagmiProvider, QueryClientProvider,
// and AutoConnect component. It uses farcasterFrame() connector when inside a
// Mini App (detected via sdk.context), or coinbaseWallet() when outside.
//
// IMPORTANT: Do NOT wrap children in a second WagmiProvider or QueryClientProvider.
// Doing so creates two separate wagmi instances — AutoConnect connects one while
// the app reads from the other, causing isConnected to always be false in Farcaster.

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MiniKitProvider
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
      {children}
    </MiniKitProvider>
  );
}
