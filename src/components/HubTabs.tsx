"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeTabFor, type NavEntry } from "@/lib/navigation";

// The row of tabs along the top of a grouped section (Money, Fleet, ...).
// It's one link per page, so every tab has its own web address — the Back
// button and bookmarks work, and nothing loads until you open its tab.
//
// Only appears on the tab pages themselves, not on a booking's detail page
// or an edit form, where it would just be clutter.
export function HubTabs({ entries }: { entries: NavEntry[] }) {
  const pathname = usePathname();
  const hub = entries.find((entry) => entry.tabs.length > 1 && activeTabFor(entry, pathname));
  if (!hub) return null;
  const active = activeTabFor(hub, pathname);

  return (
    <nav aria-label={`${hub.label} sections`} className="print:hidden -mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max min-w-full gap-2 sm:w-auto sm:flex-wrap">
        {hub.tabs.map((tab) => {
          const isActive = active?.href === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-bold transition-colors ${
                  isActive
                    ? "bg-brand text-on-brand shadow-sm"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {tab.label}
                {tab.external && (
                  <span aria-hidden="true" className="text-xs opacity-70">
                    ↗
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
