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
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/customers" ? pathname === "/customers" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-ink text-white"
                : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
