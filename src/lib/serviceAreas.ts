// Middle Georgia cities/towns Mobi Dumpsters actually serves, used to
// generate one SEO landing page per area (src/app/dumpster-rental-[slug])
// plus the areaServed list in LocalBusiness structured data.
export type ServiceArea = {
  slug: string;
  city: string;
  county: string;
  blurb: string;
};

export const serviceAreas: ServiceArea[] = [
  {
    slug: "byron-ga",
    city: "Byron",
    county: "Peach County",
    blurb:
      "As a Byron-based company, this is our home turf — fast delivery and pickup right along I-75.",
  },
  {
    slug: "warner-robins-ga",
    city: "Warner Robins",
    county: "Houston County",
    blurb:
      "From home cleanouts near Robins Air Force Base to full property renovations, we're a quick drive from anywhere in Warner Robins.",
  },
  {
    slug: "macon-ga",
    city: "Macon",
    county: "Bibb County",
    blurb:
      "Whether it's a downtown Macon renovation or a residential cleanout, we deliver dumpsters and handle junk removal and demolition throughout the city.",
  },
  {
    slug: "perry-ga",
    city: "Perry",
    county: "Houston County",
    blurb:
      "From home projects to event cleanup near the Georgia National Fairgrounds, we keep Perry job sites clear.",
  },
  {
    slug: "bonaire-ga",
    city: "Bonaire",
    county: "Houston County",
    blurb:
      "Bonaire's growing fast, and so are the renovation and cleanout projects that come with it — we're ready to help.",
  },
  {
    slug: "kathleen-ga",
    city: "Kathleen",
    county: "Houston County",
    blurb:
      "We regularly serve Kathleen and the surrounding Houston County area for rentals, junk removal, and demolition.",
  },
  {
    slug: "fort-valley-ga",
    city: "Fort Valley",
    county: "Peach County",
    blurb:
      "From Fort Valley home projects to larger cleanouts, we bring reliable dumpster rental and junk removal to Peach County.",
  },
  {
    slug: "roberta-ga",
    city: "Roberta",
    county: "Crawford County",
    blurb:
      "We're proud to serve Roberta and the rest of Crawford County with dependable dumpster rental, junk removal, and demolition.",
  },
];

export function getServiceArea(slug: string): ServiceArea | undefined {
  return serviceAreas.find((area) => area.slug === slug);
}
