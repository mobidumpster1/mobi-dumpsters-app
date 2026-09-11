"use client";

// Hero/CtaBanner build onCommit/onFieldChange closures (for EditableText/
// EditableImage) even on the live, non-editable path — a plain function
// created in a Server Component can't be passed as a prop into a Client
// Component (the RSC boundary rule bitten a few times already in this
// codebase, see project memory). Since this file is rendered directly by
// a Server Component (book/page.tsx) either way, the whole module needs
// to be a client component, same reasoning as CanvasRenderer.tsx.
import { getSectionBackground, getSectionWidthMode, type SectionInstance, type SectionWidthMode } from "@/lib/websiteSections";
import type { SectionBackground } from "@/lib/websiteBuilderMedia";
import { BookingForm, type BookingFormProps } from "@/app/book/BookingForm";
import { priceLabel, includedTerms, type CategoryOption } from "@/app/book/categoryPricing";
import { FreeCanvasBand } from "./FreeCanvasBand";
import { EditableText } from "./EditableText";
import { EditableImage } from "./EditableImage";
import { SectionBackgroundMedia } from "./SectionBackgroundMedia";

// Now that sections no longer share one page-level card (each is
// independently full-bleed-or-not), every plain section needs its own
// surface background so the page doesn't look transparent/broken where a
// section has no media of its own.
function SectionWrapper({ children }: { children: React.ReactNode }) {
  return (
    <section className="px-4 py-10 sm:px-8" style={{ backgroundColor: "var(--pt-surface)" }}>
      {children}
    </section>
  );
}

// Hero/CtaBanner's wrapper — background spans the full section (edge to
// edge in "full" width mode, width:100% not 100vw so it can never cause a
// horizontal scrollbar), content stays inside a max-w-[1200px] container
// so text never runs to the screen edge on a wide monitor. "Contained"
// mode caps the whole section at that same width instead, closer to
// today's look. min-height reserves space before image/video loads (the
// concrete CLS fix) — only applied when there's actual media to wait for.
function BackgroundSectionWrapper({
  widthMode,
  background,
  priority,
  children,
}: {
  widthMode: SectionWidthMode;
  background: SectionBackground;
  priority?: boolean;
  children: React.ReactNode;
}) {
  const hasMedia = background.type !== "color";
  return (
    <section
      className={`relative flex flex-col items-center justify-center overflow-hidden px-4 py-10 text-center sm:px-8 ${
        widthMode === "full" ? "w-full" : "mx-auto w-full max-w-[1200px] rounded-2xl"
      }`}
      style={{
        minHeight: hasMedia ? "clamp(420px, 70svh, 760px)" : undefined,
        backgroundColor: hasMedia ? undefined : "var(--pt-surface)",
      }}
    >
      <SectionBackgroundMedia background={background} priority={priority} />
      <div className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-col items-center gap-4">{children}</div>
    </section>
  );
}

const TEXT_SHADOW = "0 2px 10px rgba(0,0,0,0.55)";

// Hero/CtaBanner double as both the editor's live preview and the published
// page's renderer (same component, gated by `editable`) — this is what
// makes on-page editing possible without forking a separate "editing"
// version of a section. `onFieldChange` is only ever called when editable.
function Hero({
  props,
  widthMode,
  background,
  priority,
  editable,
  onFieldChange,
}: {
  props: Record<string, string>;
  widthMode: SectionWidthMode;
  background: SectionBackground;
  priority?: boolean;
  editable: boolean;
  onFieldChange: (key: string, value: string) => void;
}) {
  const showButton = editable || (props.buttonLabel && props.buttonHref);
  const hasMedia = background.type !== "color";
  const textShadow = hasMedia && "textShadow" in background && background.textShadow ? TEXT_SHADOW : undefined;
  return (
    <BackgroundSectionWrapper widthMode={widthMode} background={background} priority={priority}>
      <div className="flex w-full max-w-xl flex-col items-center gap-4">
        {(props.imageUrl || editable) && !hasMedia && (
          <EditableImage
            url={props.imageUrl || null}
            alt=""
            editable={editable}
            onChange={(url) => onFieldChange("imageUrl", url)}
            className="h-48 w-full rounded-xl"
            emptyLabel="Click to add a photo"
          />
        )}
        <EditableText
          as="h1"
          value={props.headline ?? ""}
          editable={editable}
          placeholder="Add a headline"
          onCommit={(v) => onFieldChange("headline", v)}
          className="w-full text-3xl font-bold"
          style={{ color: "var(--pt-text)", fontFamily: "var(--pt-font-display)", textShadow }}
        />
        <EditableText
          as="p"
          value={props.subheadline ?? ""}
          editable={editable}
          multiline
          placeholder="Add a subheadline"
          onCommit={(v) => onFieldChange("subheadline", v)}
          className="w-full"
          style={{ color: "var(--pt-text-muted)", textShadow }}
        />
        {showButton &&
          (editable ? (
            <EditableText
              as="div"
              value={props.buttonLabel ?? ""}
              editable
              placeholder="Button text"
              onCommit={(v) => onFieldChange("buttonLabel", v)}
              className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white"
            />
          ) : (
            <a href={props.buttonHref} className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark">
              {props.buttonLabel}
            </a>
          ))}
      </div>
    </BackgroundSectionWrapper>
  );
}

function CtaBanner({
  props,
  widthMode,
  background,
  priority,
  editable,
  onFieldChange,
}: {
  props: Record<string, string>;
  widthMode: SectionWidthMode;
  background: SectionBackground;
  priority?: boolean;
  editable: boolean;
  onFieldChange: (key: string, value: string) => void;
}) {
  const showButton = editable || (props.buttonLabel && props.buttonHref);
  const hasMedia = background.type !== "color";
  const textShadow = hasMedia && "textShadow" in background && background.textShadow ? TEXT_SHADOW : undefined;
  return (
    <BackgroundSectionWrapper widthMode={widthMode} background={background} priority={priority}>
      <div
        className="flex w-full max-w-xl flex-col items-center gap-4 rounded-2xl p-8"
        style={{ backgroundColor: hasMedia ? "transparent" : "var(--pt-brand-subtle)" }}
      >
        <EditableText
          as="h2"
          value={props.headline ?? ""}
          editable={editable}
          placeholder="Add a headline"
          onCommit={(v) => onFieldChange("headline", v)}
          className="w-full text-xl font-bold"
          style={{ color: "var(--pt-text)", fontFamily: "var(--pt-font-display)", textShadow }}
        />
        {showButton &&
          (editable ? (
            <EditableText
              as="div"
              value={props.buttonLabel ?? ""}
              editable
              placeholder="Button text"
              onCommit={(v) => onFieldChange("buttonLabel", v)}
              className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white"
            />
          ) : (
            <a href={props.buttonHref} className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark">
              {props.buttonLabel}
            </a>
          ))}
      </div>
    </BackgroundSectionWrapper>
  );
}

function InventoryGrid({ categories }: { categories: CategoryOption[] }) {
  if (categories.length === 0) {
    return (
      <SectionWrapper>
        <p className="text-center" style={{ color: "var(--pt-text-muted)" }}>Nothing to show yet — add a rental type in Equipment first.</p>
      </SectionWrapper>
    );
  }
  return (
    <SectionWrapper>
      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
        {categories.map((c) => (
          <div key={c.id} className="overflow-hidden rounded-xl border border-zinc-200" style={{ backgroundColor: "var(--pt-surface-alt)" }}>
            {c.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.imageUrl} alt={c.name} className="h-32 w-full object-cover" />
            )}
            <div className="p-4">
              <p className="font-semibold" style={{ color: "var(--pt-text)" }}>{c.name}</p>
              {priceLabel(c) && <p className="text-sm font-semibold text-brand">{priceLabel(c)}</p>}
            </div>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}

function PricingTable({ categories }: { categories: CategoryOption[] }) {
  if (categories.length === 0) {
    return (
      <SectionWrapper>
        <p className="text-center" style={{ color: "var(--pt-text-muted)" }}>Nothing to show yet — add a rental type in Equipment first.</p>
      </SectionWrapper>
    );
  }
  return (
    <SectionWrapper>
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {categories.map((c) => {
          const terms = includedTerms(c);
          return (
            <div key={c.id} className="rounded-xl border border-zinc-200 p-5" style={{ backgroundColor: "var(--pt-surface-alt)" }}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold" style={{ color: "var(--pt-text)" }}>{c.name}</p>
                {priceLabel(c) && <p className="font-semibold text-brand">{priceLabel(c)}</p>}
              </div>
              {terms.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1 text-sm" style={{ color: "var(--pt-text-muted)" }}>
                  {terms.map((line) => (
                    <li key={line}>• {line}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </SectionWrapper>
  );
}

export function SectionList({
  sections,
  categories,
  bookingFormProps,
  editable = false,
  onFieldChange,
}: {
  sections: SectionInstance[];
  categories: CategoryOption[];
  bookingFormProps: BookingFormProps;
  editable?: boolean;
  onFieldChange?: (sectionId: string, key: string, value: string) => void;
}) {
  return (
    <div className="flex flex-col" style={{ fontFamily: "var(--pt-font-body)" }}>
      {sections.map((section, index) => {
        const fieldChange = (key: string, value: string) => onFieldChange?.(section.id, key, value);
        const priority = index === 0;
        switch (section.type) {
          case "hero":
            return (
              <Hero
                key={section.id}
                props={section.props}
                widthMode={getSectionWidthMode(section)}
                background={getSectionBackground(section)}
                priority={priority}
                editable={editable}
                onFieldChange={fieldChange}
              />
            );
          case "ctaBanner":
            return (
              <CtaBanner
                key={section.id}
                props={section.props}
                widthMode={getSectionWidthMode(section)}
                background={getSectionBackground(section)}
                priority={priority}
                editable={editable}
                onFieldChange={fieldChange}
              />
            );
          case "inventoryGrid":
            return <InventoryGrid key={section.id} categories={categories} />;
          case "pricingTable":
            return <PricingTable key={section.id} categories={categories} />;
          case "bookingWidget":
            return (
              <SectionWrapper key={section.id}>
                <div className="mx-auto max-w-xl">
                  <BookingForm {...bookingFormProps} />
                </div>
              </SectionWrapper>
            );
          case "freeCanvas":
            return (
              <FreeCanvasBand
                key={section.id}
                blocks={section.props.blocks}
                designWidth={section.props.designWidth}
                height={section.props.height}
                bookingFormProps={bookingFormProps}
              />
            );
        }
      })}
    </div>
  );
}
