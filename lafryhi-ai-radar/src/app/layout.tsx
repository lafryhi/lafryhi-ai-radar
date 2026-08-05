import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { PublicNavigation } from "@/components/public-navigation";
import "./globals.css";
import "./landing.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://lafryhi-ai-radar-1090908272413.us-central1.run.app"),
  title: "LAFRYHI AI Radar | Decision Intelligence for Small Businesses",
  description: "Transform trusted AI signals into confident business decisions with Gemini-powered decision intelligence.",
  icons: {
    icon: [{ url: "/lafryhi-ai-radar-logo.png", type: "image/png" }],
    shortcut: "/lafryhi-ai-radar-logo.png",
    apple: "/lafryhi-ai-radar-logo.png",
  },
  openGraph: {
    type: "website",
    title: "LAFRYHI AI Radar | Decision Intelligence for Small Businesses",
    description: "Transform trusted AI signals into confident business decisions with Gemini-powered decision intelligence.",
    images: [{ url: "/lafryhi-ai-radar-logo.png", width: 397, height: 346, alt: "LAFRYHI AI Radar" }],
  },
  twitter: {
    card: "summary",
    title: "LAFRYHI AI Radar | Decision Intelligence for Small Businesses",
    description: "Transform trusted AI signals into confident business decisions with Gemini-powered decision intelligence.",
    images: ["/lafryhi-ai-radar-logo.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <header className="site-header">
      <Link href="/" className="brand" aria-label="LAFRYHI AI Radar home"><BrandLogo priority /></Link>
      <PublicNavigation />
    </header>
    <main>{children}</main>
    <footer className="site-footer">
      <div className="footer-brand"><BrandLogo className="footer-logo" /><p>Decision intelligence built for small businesses.</p></div>
      <nav className="footer-links" aria-label="Footer navigation">
        <div><strong>Product</strong><Link href="/#how-it-works">How it works</Link><Link href="/pricing">Pricing</Link><Link href="/get-started">Start Free</Link></div>
        <div><strong>Company</strong><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/refund-policy">Refund Policy</Link></div>
        <div><strong>Support</strong><a href="mailto:contact@lafryhi.com">Contact</a><span className="footer-powered"><Image src="/gemini-spark.svg" alt="" width={18} height={18} /> Powered by Gemini</span></div>
      </nav>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} LAFRYHI AI Radar.</span><span>Independent product. Not affiliated with or endorsed by Google.</span></div>
    </footer>
  </body></html>;
}
