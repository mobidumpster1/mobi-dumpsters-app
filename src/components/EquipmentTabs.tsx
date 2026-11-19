"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/equipment", label: "Equipment" },
  { href: "/equipment/categories", label: "Rental Types" },
  { href: "/equipment/locations", label: "Locations" },
  { href: "/equipment/tracking", label: "Tracking" },
];

export function EquipmentTabs() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2" aria-label="Sub-sections">
      {TABS.map((tab) => {
        const isActive =
          tab.href === "/equipment"
            ? pathname === "/equipment"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition-colors ${
              isActive
                ? "border-brand bg-brand/10 text-brand-fg"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
