import type { ReactNode } from "react";

// Shared building blocks for the admin pages, so headers, buttons, badges and
// empty states look and behave the same everywhere instead of each page
// hand-rolling its own.

// ---- Buttons --------------------------------------------------------------
// "primary" is the one main action on a page (orange); "secondary" is
// everything else; "danger" is destructive. All have a 44px-high hit area.
// Use on <button>, <Link> or <a>.
type ButtonVariant = "primary" | "secondary" | "danger";

const BUTTON_BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-all";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-105 active:scale-[0.99]",
  secondary: "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50",
  danger: "border border-red-200 text-red-600 hover:bg-red-50",
};

export function buttonClass(variant: ButtonVariant = "secondary"): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]}`;
}

// ---- Page header ----------------------------------------------------------
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-3xl font-black tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// ---- Badge ----------------------------------------------------------------
// One status pill for everything (bookings, invoices, equipment). Colors say
// what kind of state it is: good / waiting / bad / in motion / neutral.
export type BadgeTone = "success" | "warning" | "danger" | "info" | "progress" | "neutral";

const BADGE_TONES: Record<BadgeTone, string> = {
  success: "bg-green-600",
  warning: "bg-amber-500",
  danger: "bg-red-600",
  info: "bg-blue-600",
  progress: "bg-purple-600",
  neutral: "bg-zinc-500",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-block flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-black text-on-brand ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

const BOOKING_TONES: Record<string, BadgeTone> = {
  pending: "warning",
  scheduled: "info",
  in_progress: "progress",
  completed: "success",
  cancelled: "neutral",
};

export function bookingTone(value: string): BadgeTone {
  return BOOKING_TONES[value] ?? "neutral";
}

const INVOICE_TONES: Record<string, BadgeTone> = {
  paid: "success",
  unpaid: "warning",
  partial: "warning",
  overdue: "danger",
};

export function invoiceTone(value: string): BadgeTone {
  return INVOICE_TONES[value] ?? "neutral";
}

// ---- Empty state ------------------------------------------------------------
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-zinc-500">
      {children}
    </p>
  );
}
