"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function CustomerTabs({ showWinBack }: { showWinBack: boolean }) {
  const pathname = usePathname();

  const tabs = [
    { href: "/customers", label: "Customers" },
    ...(showWinBack ? [{ href: "/customers/winback", label: "Win-Back" }] : []),
  ];

  return (
    <div className="flex flex-wrap gap-2" aria-label="Sub-sections">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/customers" ? pathname === "/customers" : pathname.startsWith(tab.href);
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
