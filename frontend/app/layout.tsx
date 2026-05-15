import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "CoverChain — Micro-Insurance on Celo",
  description: "Parametric micro-insurance for MiniPay users. Protect your device, health, and farm with instant cUSD payouts. No bank needed.",
  keywords: ["insurance", "celo", "minipay", "defi", "web3"],
  other: {
    "talentapp:project_verification": "a66b350b9bff43519d3286cde58765ffdc831b5e7a53584513db7f3480437169a2d6dc2fa6460e5670a7a2ced33587383ad33c14d7b134c64ce307289a245b6c",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
