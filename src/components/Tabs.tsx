"use client";

import { useState } from "react";

export type TabItem = {
  id: string;
  label: string;
  content: React.ReactNode;
};

// Optional second level: a few headings ("Money", "Customers", ...) each
// holding some of the tabs, so a page with a dozen tabs shows three headings
// plus only the handful under the one you're in.
export type TabGroup = { label: string; ids: string[] };

const PILL_ACTIVE = "bg-brand text-on-brand shadow-sm";
const PILL_IDLE = "bg-zinc-100 text-zinc-700 hover:bg-zinc-200";
const PILL_BASE = "min-h-11 whitespace-nowrap rounded-full px-4 text-sm font-bold transition-colors";

function TabRow({
  items,
  activeId,
  onSelect,
  small = false,
}: {
  items: { id: string; label: string }[];
  activeId: string;
  onSelect: (id: string) => void;
  small?: boolean;
}) {
  return (
    // One scrollable row (not a wrapping pile of rows) so a page with many
    // tabs stays tidy on a phone; same pill look as the section tab bars.
    <div className="print:hidden -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div role="tablist" className="flex w-max min-w-full gap-2 sm:w-auto sm:flex-wrap">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(item.id)}
              className={`${PILL_BASE} ${
                small
                  ? isActive
                    ? "border border-brand bg-brand/10 text-brand-fg"
                    : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                  : isActive
                    ? PILL_ACTIVE
                    : PILL_IDLE
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Generic tab switcher for long pages that accumulated many stacked
// sections (booking detail, reports) — shows one group at a time instead
// of an endless scroll. initialTab lets the caller pick which group should
// be visible on first render (e.g. computed from searchParams so a
// redirect-back confirmation message lands on the tab that shows it).
export function Tabs({
  tabs,
  initialTab,
  groups,
}: {
  tabs: TabItem[];
  initialTab: string;
  groups?: TabGroup[];
}) {
  const [active, setActive] = useState(initialTab);
  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];

  const tabIds = new Set(tabs.map((t) => t.id));
  const visibleGroups = (groups ?? [])
    .map((group) => ({ ...group, ids: group.ids.filter((id) => tabIds.has(id)) }))
    .filter((group) => group.ids.length > 0);
  const activeGroup = visibleGroups.find((group) => group.ids.includes(activeTab.id));

  return (
    <div>
      {visibleGroups.length > 0 ? (
        <div className="flex flex-col gap-3">
          <TabRow
            items={visibleGroups.map((group) => ({ id: group.label, label: group.label }))}
            activeId={activeGroup?.label ?? ""}
            onSelect={(label) => {
              const group = visibleGroups.find((g) => g.label === label);
              if (group) setActive(group.ids[0]);
            }}
          />
          {activeGroup && activeGroup.ids.length > 1 && (
            <TabRow
              small
              items={activeGroup.ids.map((id) => ({ id, label: tabs.find((t) => t.id === id)!.label }))}
              activeId={activeTab.id}
              onSelect={setActive}
            />
          )}
        </div>
      ) : (
        <TabRow items={tabs} activeId={activeTab.id} onSelect={setActive} />
      )}
      <h2 className="hidden text-lg font-black text-ink print:block">{activeTab.label}</h2>
      <div className="mt-6 flex flex-col gap-6">{activeTab.content}</div>
    </div>
  );
}
