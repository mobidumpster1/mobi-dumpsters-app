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
      <div className="flex flex-wrap gap-2 border-b-2 border-zinc-900 pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={
              tab.id === activeTab.id
                ? "rounded-lg bg-zinc-900 px-4 py-2 text-sm font-bold text-white"
                : "rounded-lg px-4 py-2 text-sm font-bold text-zinc-500 hover:bg-zinc-100"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-6">{activeTab.content}</div>
    </div>
  );
}
