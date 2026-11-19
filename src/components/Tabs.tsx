"use client";

import { useState } from "react";

export type TabItem = {
  id: string;
  label: string;
  content: React.ReactNode;
};

// Generic tab switcher for long pages that accumulated many stacked
// sections (Settings, booking detail) — shows one group at a time instead
// of an endless scroll. initialTab lets the caller pick which group should
// be visible on first render (e.g. computed from searchParams so a
// redirect-back confirmation message lands on the tab that shows it).
export function Tabs({ tabs, initialTab }: { tabs: TabItem[]; initialTab: string }) {
  const [active, setActive] = useState(initialTab);
  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div>
      {/* One scrollable row (not a wrapping pile of rows) so a page with many
          tabs stays tidy on a phone; same pill look as the section tab bars. */}
      <div className="print:hidden -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div role="tablist" className="flex w-max min-w-full gap-2 sm:w-auto sm:flex-wrap">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(tab.id)}
                className={`min-h-11 whitespace-nowrap rounded-full px-4 text-sm font-bold transition-colors ${
                  isActive
                    ? "bg-brand text-on-brand shadow-sm"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <h2 className="hidden text-lg font-black text-ink print:block">{activeTab.label}</h2>
      <div className="mt-6 flex flex-col gap-6">{activeTab.content}</div>
    </div>
  );
}
