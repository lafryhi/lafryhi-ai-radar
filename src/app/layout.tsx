import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "LAFRYHI AI Radar",
  description: "Verified AI developments translated into practical decisions.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><header><Link href="/" className="brand">LAFRYHI AI Radar</Link><nav><Link href="/">Radar feed</Link><Link href="/operator">Operator</Link></nav></header><main>{children}</main><footer>Phase 1 vertical slice · AI-analyzed, human-reviewed</footer></body></html>;
}
