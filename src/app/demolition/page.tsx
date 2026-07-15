import Link from "next/link";
import type { Metadata } from "next";
import { listBookableCategories } from "@/lib/availability";
import { branding } from "@/lib/branding";
import { UtmCapture } from "@/components/UtmCapture";

export const dynamic = "force-dynamic";

const SERVICE_AREAS = ["Byron", "Warner Robins", "Perry", "Fort Valley", "Milledgeville"];

export function generateMetadata(): Metadata {
  const title = `Demolition Services in Middle Georgia | ${branding.businessName}`;
  const description = `Shed, deck, porch, pool, and mobile home demolition serving ${SERVICE_AREAS.join(", ")}, GA and the surrounding area. Fully insured, fast turnaround, upfront pricing. Call ${branding.phone}.`;

  return {
    title,
    description,
    alternates: { canonical: "/demolition" },
    openGraph: { title, description },
  };
}

export default async function DemolitionPage() {
  const categories = await listBookableCategories();
  const demolition = categories.find((c) => c.name.toLowerCase() === "demolition");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Demolition",
    name: `Demolition Services | ${branding.businessName}`,
    description: `Small structure demolition — sheds, decks, porches, pools, and mobile homes — from ${branding.businessName}.`,
    provider: {
      "@type": "LocalBusiness",
      name: branding.businessName,
      telephone: branding.phone || undefined,
      email: branding.email || undefined,
    },
    areaServed: SERVICE_AREAS.map((city) => ({ "@type": "City", name: `${city}, GA` })),
  };

  return (
    <div className="theme-public-dark min-h-screen bg-background px-4 py-10">
      <UtmCapture />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand">
            Demolition
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">
            Tear it down, haul it off
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-zinc-500">
            Sheds, decks, porches, pools, mobile homes, and small structures —
            fully insured and fast, serving {SERVICE_AREAS.join(", ")}, GA and
            the surrounding area.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-sm overflow-hidden rounded-2xl bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://img1.wsimg.com/isteam/ip/7427ea4c-94f6-479a-8098-c7264e5c06f7/IMG_1317.jpeg/:/rs=w:640,cg:true,m"
            alt="Demolition"
            className="h-48 w-full object-cover"
          />
          <div className="p-5">
            <p className="text-lg font-bold text-ink">Demolition</p>
            <p className="mt-1 text-sm text-zinc-500">
              Sheds, decks, concrete slabs &amp; more. Fast &amp; fully
              insured.
            </p>
            <p className="mt-3 text-base font-bold text-brand">
              {demolition?.basePrice != null
                ? `From $${demolition.basePrice.toFixed(2)}`
                : "Call for pricing"}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/book?category=Demolition"
                className="rounded-xl bg-brand px-5 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-brand-dark"
              >
                Book online
              </Link>
              {branding.phone && (
                <a
                  href={`tel:${branding.phone.replace(/[^\d+]/g, "")}`}
                  className="rounded-xl border border-zinc-300 px-5 py-3 text-center text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  Call for quote
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-2xl text-sm leading-relaxed text-zinc-500">
          <p className="mb-3">
            <strong className="text-ink">What we tear down:</strong> decks,
            fences, sheds, outbuildings, porches, pools, and mobile homes.
            Bigger project in mind? Give us a call and we&apos;ll talk through
            it.
          </p>
          <p>
            <strong className="text-ink">How it works:</strong> Call or text
            with details on what needs to come down, we give you a
            straightforward quote, we handle the teardown and clear out the
            debris. Payment by invoice, cash, Cash App, or credit card — no
            personal checks.
          </p>
        </div>

        <p className="mt-10 text-center text-xs italic text-zinc-500">
          &quot;And whatsoever ye do, do it heartily, as to the Lord, and not
          unto men.&quot; — Colossians 3:23
        </p>
      </div>
    </div>
  );
}
