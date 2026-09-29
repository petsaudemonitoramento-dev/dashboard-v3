"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  ChartNoAxesCombined,
  DatabaseZap,
  Gauge,
  LandPlot,
  ListChecks,
  ShieldCheck,
} from "lucide-react";

const ICONS = {
  dashboard: BarChart3,
  import: DatabaseZap,
  indicators: Gauge,
  establishments: Building2,
  comparisons: ChartNoAxesCombined,
  summary: ListChecks,
  territory: LandPlot,
  administration: ShieldCheck,
} as const;

export type NavigationItem = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
};

export function SystemNavigation({ items }: { items: NavigationItem[] }) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  return (
    <nav className="main-nav" aria-label="Navegação principal">
      {items.map(({ href, label, icon }) => {
        const Icon = ICONS[icon];
        const [path, anchor] = href.split("#");
        const active = pathname === path && (anchor ? hash === `#${anchor}` : !hash);
        return (
          <Link aria-current={active ? "page" : undefined} key={href} href={href}>
            <Icon className="mr-1 inline size-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
