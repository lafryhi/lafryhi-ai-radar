"use client";

import Link from "next/link";
import { useRef } from "react";

const primaryLinks = [
  { href: "/get-started", label: "Get Started" },
  { href: "/decisions", label: "Decision Briefs" },
  { href: "/impact", label: "My Impact" },
  { href: "/pricing", label: "Pricing" },
  { href: "/billing", label: "Billing" },
];

const secondaryLinks = [
  { href: "/business-profile", label: "My Business Profile" },
  { href: "/#decision-center", label: "Decision Center" },
  { href: "/#trusted-signals", label: "Signals" },
  { href: "/#opportunities", label: "Opportunities" },
  { href: "/operator/sources", label: "Trusted Sources" },
];

function NavigationMenu({
  label,
  links,
  className,
}: {
  label: string;
  links: typeof primaryLinks;
  className: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const closeMenu = () => detailsRef.current?.removeAttribute("open");

  return <details className={className} ref={detailsRef}>
    <summary>{label}</summary>
    <div className="nav-menu" role="group" aria-label={`${label} navigation`}>
      {links.map((link) => <Link href={link.href} key={link.href} onClick={closeMenu}>{link.label}</Link>)}
    </div>
  </details>;
}

export function PublicNavigation() {
  return <nav className="public-nav" aria-label="Primary navigation">
    <div className="desktop-primary">
      {primaryLinks.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}
      <NavigationMenu label="Explore" links={secondaryLinks} className="nav-dropdown" />
    </div>
    <NavigationMenu label="Menu" links={[...primaryLinks, ...secondaryLinks]} className="mobile-nav" />
  </nav>;
}
