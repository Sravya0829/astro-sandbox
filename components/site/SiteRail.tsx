"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import BrandMark from "@/components/site/BrandMark";

type Section = { id: string; label: string };

const pages = [
  { href: "/simulator", label: "Simulator" },
  { href: "/dashboard", label: "My simulations" },
];

function useActiveSection(sections: Section[]) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  useEffect(() => {
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && setActive(entry.target.id)),
      { rootMargin: "-40% 0px -55% 0px" },
    );
    sections.forEach(({ id }) => { const element = document.getElementById(id); if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, [sections]);
  return active;
}

export default function SiteRail({ sections = [] }: { sections?: Section[] }) {
  const pathname = usePathname();
  const active = useActiveSection(sections);
  const sectionHref = (id: string) => (pathname === "/" ? `#${id}` : `/#${id}`);

  return (
    <header className="site-rail">
      <Link className="brand" href="/" aria-label="Astro Sandbox home"><BrandMark /><span>Astro <em>Sandbox</em></span></Link>

      <nav className="rail-nav" aria-label="Primary navigation">
        {sections.length > 0 && (
          <div className="rail-group">
            <span className="rail-label">Contents</span>
            <ol>
              {sections.map(({ id, label }, index) => (
                <li key={id}><a className={active === id ? "active" : ""} href={sectionHref(id)}><span>§{index}</span>{label}</a></li>
              ))}
            </ol>
          </div>
        )}
        <div className="rail-group">
          <span className="rail-label">Pages</span>
          <ul>
            {pages.map(({ href, label }) => (
              <li key={href}><Link className={pathname === href ? "active" : ""} href={href}>{label}</Link></li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="rail-foot">
        <Link className="button button-primary" href="/simulator">Open simulator</Link>
        <Link className="button button-ghost" href="/dashboard">Sign in</Link>
        <span className="rail-version">v0.1 · schema v1</span>
      </div>

      <details className="mobile-menu">
        <summary aria-label="Open navigation"><Menu size={22} /></summary>
        <nav aria-label="Mobile navigation">
          {sections.map(({ id, label }) => <a key={id} href={sectionHref(id)}>{label}</a>)}
          {pages.map(({ href, label }) => <Link key={href} href={href}>{label}</Link>)}
          <Link className="button button-primary" href="/simulator">Open simulator</Link>
        </nav>
      </details>
    </header>
  );
}
