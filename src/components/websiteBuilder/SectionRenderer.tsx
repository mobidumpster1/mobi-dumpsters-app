import type { SectionInstance } from "@/lib/websiteSections";
import { BookingForm, type BookingFormProps } from "@/app/book/BookingForm";
import { priceLabel, includedTerms, type CategoryOption } from "@/app/book/categoryPricing";

function SectionWrapper({ children }: { children: React.ReactNode }) {
  return <section className="px-4 py-10 sm:px-8">{children}</section>;
}

function Hero({ props }: { props: Record<string, string> }) {
  return (
    <SectionWrapper>
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
        {props.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.imageUrl} alt="" className="h-48 w-full rounded-xl object-cover" />
        )}
        {props.headline && <h1 className="text-3xl font-bold text-ink">{props.headline}</h1>}
        {props.subheadline && <p className="text-zinc-500">{props.subheadline}</p>}
        {props.buttonLabel && props.buttonHref && (
          <a
            href={props.buttonHref}
            className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            {props.buttonLabel}
          </a>
        )}
      </div>
    </SectionWrapper>
  );
}

function CtaBanner({ props }: { props: Record<string, string> }) {
  return (
    <SectionWrapper>
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl bg-brand/10 p-8 text-center">
        {props.headline && <h2 className="text-xl font-bold text-ink">{props.headline}</h2>}
        {props.buttonLabel && props.buttonHref && (
          <a
            href={props.buttonHref}
            className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            {props.buttonLabel}
          </a>
        )}
      </div>
    </SectionWrapper>
  );
}

function InventoryGrid({ categories }: { categories: CategoryOption[] }) {
  if (categories.length === 0) {
    return (
      <SectionWrapper>
        <p className="text-center text-zinc-400">Nothing to show yet — add a rental type in Equipment first.</p>
      </SectionWrapper>
    );
  }
  return (
    <SectionWrapper>
      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
        {categories.map((c) => (
          <div key={c.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {c.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.imageUrl} alt={c.name} className="h-32 w-full object-cover" />
            )}
            <div className="p-4">
              <p className="font-semibold text-ink">{c.name}</p>
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
        <p className="text-center text-zinc-400">Nothing to show yet — add a rental type in Equipment first.</p>
      </SectionWrapper>
    );
  }
  return (
    <SectionWrapper>
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {categories.map((c) => {
          const terms = includedTerms(c);
          return (
            <div key={c.id} className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-ink">{c.name}</p>
                {priceLabel(c) && <p className="font-semibold text-brand">{priceLabel(c)}</p>}
              </div>
              {terms.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1 text-sm text-zinc-600">
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
}: {
  sections: SectionInstance[];
  categories: CategoryOption[];
  bookingFormProps: BookingFormProps;
}) {
  return (
    <div className="flex flex-col">
      {sections.map((section) => {
        switch (section.type) {
          case "hero":
            return <Hero key={section.id} props={section.props} />;
          case "ctaBanner":
            return <CtaBanner key={section.id} props={section.props} />;
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
        }
      })}
    </div>
  );
}
