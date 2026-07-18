import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { listBookableCategories } from "@/lib/availability";
import { branding } from "@/lib/branding";
import { serviceAreas, getServiceArea } from "@/lib/serviceAreas";
import { UtmCapture } from "@/components/UtmCapture";
import { ReferralCapture } from "@/components/ReferralCapture";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return serviceAreas.map((area) => ({ slug: area.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const area = getServiceArea(slug);
  if (!area) return {};

  const title = `Dumpster Rental in ${area.city}, GA | ${branding.businessName}`;
  const description = `Roll-off dumpster rental, junk removal, and demolition in ${area.city}, GA. Same-week delivery, upfront pricing, and easy online booking. Call ${branding.phone}.`;

  return {
    title,
    description,
    alternates: { canonical: `/dumpster-rental/${area.slug}` },
    openGraph: { title, description },
  };
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const area = getServiceArea(slug);
  if (!area) notFound();

  const categories = await listBookableCategories();
  const otherAreas = serviceAreas.filter((a) => a.slug !== area.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: branding.businessName,
    telephone: branding.phone || undefined,
    email: branding.email || undefined,
    areaServed: { "@type": "City", name: `${area.city}, GA` },
    address: {
      "@type": "PostalAddress",
      addressLocality: area.city,
      addressRegion: "GA",
      addressCountry: "US",
    },
    priceRange: "$$",
    description: `${branding.tagline} serving ${area.city}, GA and the surrounding ${area.county}.`,
  };

  return (
    <div className="theme-light min-h-screen bg-brand-light px-4 py-10">
      <UtmCapture />
      <ReferralCapture />
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Dumpster Rental in {area.city}, GA
          </h1>
          <p className="mt-2 text-zinc-600">
            {branding.tagline} — serving {area.city} and all of {area.county}.
          </p>
          <p className="mt-3 text-sm text-zinc-600">{area.blurb}</p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/book"
            className="rounded-xl bg-brand px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Book Online
          </Link>
          {branding.phone && (
            <a
              href={`tel:${branding.phone.replace(/[^\d+]/g, "")}`}
              className="rounded-xl border border-zinc-300 bg-white px-6 py-3 text-base font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Call {branding.phone}
            </a>
          )}
        </div>

        {categories.length > 0 && (
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-ink">Pricing</h2>
            <div className="mt-4 flex flex-col gap-4">
              {categories.map((category) => (
                <div key={category.id} className="border-b border-zinc-100 pb-4 last:border-0 last:pb-0">
                  <p className="font-semibold text-zinc-900">{category.name}</p>
                  {category.description && (
                    <p className="text-sm text-zinc-500">{category.description}</p>
                  )}
                  {category.pricingTiers.length > 0 ? (
                    <ul className="mt-2 flex flex-col gap-1 text-sm text-zinc-700">
                      {category.pricingTiers.map((tier) => (
                        <li key={tier.id} className="flex justify-between">
                          <span>{tier.label}</span>
                          <span className="font-medium">
                            {tier.price != null ? `$${tier.price.toFixed(2)}` : "Call for pricing"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : category.basePrice != null ? (
                    <p className="mt-2 text-sm font-medium text-zinc-700">
                      Starting at ${category.basePrice.toFixed(2)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <h2 className="text-lg font-semibold text-ink">Also Serving Middle Georgia</h2>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {otherAreas.map((a) => (
              <Link
                key={a.slug}
                href={`/dumpster-rental/${a.slug}`}
                className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                {a.city}, GA
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
