import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavigation } from "@/components/public-navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "LAFRYHI AI Radar | Decision Intelligence for Small Businesses",
  description: "Transform trusted AI signals into confident business decisions with Gemini-powered decision intelligence.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <header className="site-header">
      <Link href="/" className="brand"><span>LAFRYHI AI Radar</span><small>Decision Intelligence for Small Businesses</small></Link>
      <PublicNavigation />
    </header>
    <main>{children}</main>
    <footer className="site-footer">
      <strong>Built with Google Gemini and Google Cloud.</strong>
      <span>LAFRYHI AI Radar is an independent product and is not affiliated with or endorsed by Google.</span>
    </footer>
  </body></html>;
}
