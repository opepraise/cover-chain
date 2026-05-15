import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "CoverChain — Micro-Insurance on Celo",
  description: "Parametric micro-insurance for MiniPay users. Protect your device, health, and farm with instant cUSD payouts. No bank needed.",
  keywords: ["insurance", "celo", "minipay", "defi", "web3"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
