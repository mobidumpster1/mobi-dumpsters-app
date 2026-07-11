"use client";

// TEMPORARY design-exploration mockup — see ./_shared.tsx for cleanup notes.
// Split out from _shared.tsx because it needs open/close state; the rest of
// the shell stays a plain server module so its colorMap export can be
// imported directly by the (server-rendered) mockup pages.

import { useState } from "react";
import { NAV_ITEMS, Logo } from "./_shared";

export function MobileNav({ active }: { active: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/5 bg-black/40 px-4 py-3 backdrop-blur-xl md:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-zinc-300 hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[80vw] flex-col gap-6 overflow-y-auto border-r border-white/10 bg-[#0a0d12] px-4 py-6 shadow-2xl">
            <div className="flex items-center justify-between px-2">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-zinc-300 hover:bg-white/10"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <button className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-400 hover:border-white/20">
              Switch organization
              <span className="text-zinc-600">⌄</span>
            </button>
            <nav className="flex flex-col gap-1 text-sm">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={
                    item.label === active
                      ? "rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2.5 text-cyan-200 shadow-[0_0_20px_-6px_rgba(34,211,238,0.5)]"
                      : "rounded-lg px-3 py-2.5 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                  }
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-auto rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-zinc-400">
              <p className="font-medium text-zinc-200">Chase Vann</p>
              <p className="text-zinc-500">Owner</p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
