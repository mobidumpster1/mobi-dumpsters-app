"use client";

import { useState } from "react";

export type SettingsItem = {
  id: string;
  label: string;
  content: React.ReactNode;
};

export type SettingsGroup = {
  label: string;
  items: SettingsItem[];
};

// Settings as a left-hand menu: every setting is its own item and only one
// shows at a time, instead of ten cards stacked in one long scroll. On a
// phone the menu becomes a single dropdown above the content.
export function SettingsMenu({
  groups,
  initialItem,
}: {
  groups: SettingsGroup[];
  initialItem: string;
}) {
  const allItems = groups.flatMap((group) => group.items);
  const [active, setActive] = useState(initialItem);
  const activeItem = allItems.find((item) => item.id === active) ?? allItems[0];
  const activeGroup = groups.find((group) => group.items.some((item) => item.id === activeItem.id));

  return (
    <div className="grid gap-6 md:grid-cols-[14rem_minmax(0,1fr)] md:items-start">
      {/* Phone: one dropdown. */}
      <div className="print:hidden md:hidden">
        <label htmlFor="settings-section" className="mb-1 block text-sm font-semibold text-zinc-700">
          Settings section
        </label>
        <select
          id="settings-section"
          value={activeItem.id}
          onChange={(e) => setActive(e.target.value)}
          className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base font-semibold text-ink"
        >
          {groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Tablet/desktop: grouped menu down the left. */}
      <nav aria-label="Settings sections" className="print:hidden hidden md:sticky md:top-6 md:block">
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                {group.label}
              </p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const isActive = item.id === activeItem.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setActive(item.id)}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex min-h-10 w-full items-center rounded-xl px-3 text-left text-sm font-semibold transition-colors ${
                          isActive
                            ? "bg-brand text-on-brand"
                            : "text-zinc-700 hover:bg-zinc-100"
                        }`}
                      >
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="min-w-0">
        <p className="mb-4 hidden text-sm font-semibold text-zinc-500 md:block">
          {activeGroup?.label} <span aria-hidden="true">›</span> {activeItem.label}
        </p>
        <div className="flex flex-col gap-6">{activeItem.content}</div>
      </div>
    </div>
  );
}
