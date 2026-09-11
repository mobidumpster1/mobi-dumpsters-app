"use client";

// Hero/CtaBanner build onCommit/onFieldChange closures (for EditableText/
// EditableImage) even on the live, non-editable path — a plain function
// created in a Server Component can't be passed as a prop into a Client
// Component (the RSC boundary rule bitten a few times already in this
// codebase, see project memory). Since this file is rendered directly by
// a Server Component (book/page.tsx) either way, the whole module needs
// to be a client component, same reasoning as CanvasRenderer.tsx.
import type { SectionInstance } from "@/lib/websiteSections";
import { BookingForm, type BookingFormProps } from "@/app/book/BookingForm";
import { priceLabel, includedTerms, type CategoryOption } from "@/app/book/categoryPricing";
import { FreeCanvasBand } from "./FreeCanvasBand";
import { EditableText } from "./EditableText";
import { EditableImage } from "./EditableImage";

function SectionWrapper({ children }: { children: React.ReactNode }) {
  return <section className="px-4 py-10 sm:px-8">{children}</section>;
}

// Hero/CtaBanner double as both the editor's live preview and the published
// page's renderer (same component, gated by `editable`) — this is what
// makes on-page editing possible without forking a separate "editing"
// version of a section. `onFieldChange` is only ever called when editable.
function Hero({
  props,
  editable,
  onFieldChange,
}: {
  props: Record<string, string>;
  editable: boolean;
  onFieldChange: (key: string, value: string) => void;
}) {
  const showButton = editable || (props.buttonLabel && props.buttonHref);
  return (
    <SectionWrapper>
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
        {(props.imageUrl || editable) && (
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
          style={{ color: "var(--pt-text)", fontFamily: "var(--pt-font-display)" }}
        />
        <EditableText
          as="p"
          value={props.subheadline ?? ""}
          editable={editable}
          multiline
          placeholder="Add a subheadline"
          onCommit={(v) => onFieldChange("subheadline", v)}
          className="w-full"
          style={{ color: "var(--pt-text-muted)" }}
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
    </SectionWrapper>
  );
}

function CtaBanner({
  props,
  editable,
  onFieldChange,
}: {
  props: Record<string, string>;
  editable: boolean;
  onFieldChange: (key: string, value: string) => void;
}) {
  const showButton = editable || (props.buttonLabel && props.buttonHref);
  return (
    <SectionWrapper>
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl p-8 text-center" style={{ backgroundColor: "var(--pt-brand-subtle)" }}>
        <EditableText
          as="h2"
          value={props.headline ?? ""}
          editable={editable}
          placeholder="Add a headline"
          onCommit={(v) => onFieldChange("headline", v)}
          className="w-full text-xl font-bold"
          style={{ color: "var(--pt-text)", fontFamily: "var(--pt-font-display)" }}
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
    </SectionWrapper>
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
      {sections.map((section) => {
        const fieldChange = (key: string, value: string) => onFieldChange?.(section.id, key, value);
        switch (section.type) {
          case "hero":
            return <Hero key={section.id} props={section.props} editable={editable} onFieldChange={fieldChange} />;
          case "ctaBanner":
            return <CtaBanner key={section.id} props={section.props} editable={editable} onFieldChange={fieldChange} />;
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
