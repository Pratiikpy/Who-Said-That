import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Literata } from "next/font/google";
import localFont from "next/font/local";
import { minikitConfig } from "../../minikit.config";
import { Providers } from "./providers";
import { ToastProvider } from "../components/Toast";
import { MiniAppReady } from "../components/MiniAppReady";
import "./globals.css";

// Agent 10: viewport-fit=cover for safe area insets, maximum-scale=1 for iOS
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: minikitConfig.miniapp.name,
    description: minikitConfig.miniapp.description,
    other: {
      "base:app_id": "69b7f2693371bf602acd7d68",
      "fc:miniapp": JSON.stringify({
        version: "next",
        imageUrl: minikitConfig.miniapp.heroImageUrl,
        button: {
          title: minikitConfig.miniapp.name,
          action: {
            type: "launch_miniapp",
            name: `Launch ${minikitConfig.miniapp.name}`,
          },
        },
      }),
    },
  };
}

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["300", "400"],
});

// Agent 1: Only load Medium + Bold weights (drop 4 unused weights)
const clashDisplay = localFont({
  src: [
    {
      path: "../../public/fonts/WEB/fonts/ClashDisplay-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/WEB/fonts/ClashDisplay-Semibold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/WEB/fonts/ClashDisplay-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-clash",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geist.variable} ${geistMono.variable} ${clashDisplay.variable} ${literata.variable}`}
      >
        <Providers>
          <MiniAppReady />
          <ToastProvider>
            {children}
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
