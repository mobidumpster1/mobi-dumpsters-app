export type EnrichmentResult = {
  email: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
};

const EMPTY_RESULT: EnrichmentResult = {
  email: null,
  facebookUrl: null,
  instagramUrl: null,
  linkedinUrl: null,
};

const FETCH_TIMEOUT_MS = 5000;

// Best-effort contact-info scraper: fetches a lead's own website and looks
// for a mailto: link and social profile links in the page's HTML. This is
// the same technique paid services like Outscraper use — there's no API
// for "find this business's email," since Google Places doesn't return
// one, so the only source is the business's own site. Non-fatal by design
// (returns EMPTY_RESULT rather than throwing) since a slow, broken, or
// nonexistent site is expected for some fraction of leads.
export async function enrichFromWebsite(website: string): Promise<EnrichmentResult> {
  let url: URL;
  try {
    url = new URL(website);
  } catch {
    return EMPTY_RESULT;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return EMPTY_RESULT;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadEnrichmentBot/1.0)" },
        redirect: "follow",
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) return EMPTY_RESULT;
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return EMPTY_RESULT;

    const html = await response.text();
    return {
      email: extractEmail(html),
      facebookUrl: extractSocialLink(html, "facebook.com"),
      instagramUrl: extractSocialLink(html, "instagram.com"),
      linkedinUrl: extractSocialLink(html, "linkedin.com"),
    };
  } catch {
    return EMPTY_RESULT;
  }
}

function extractEmail(html: string): string | null {
  // mailto: links are the reliable signal — anything a visitor could
  // actually click. Falls back to a plain-text scan (some sites just
  // print the address instead of linking it) as a second pass only.
  const mailtoMatch = html.match(/href=["']mailto:([^"'?\s]+)/i);
  if (mailtoMatch) return decodeURIComponent(mailtoMatch[1]).toLowerCase();

  const textMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
  const candidate = textMatches.find((m) => !/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(m));
  return candidate ? candidate.toLowerCase() : null;
}

// Only counts links found in real <a href> attributes, not any mention of
// the domain in a script tag or tracking pixel — cuts down on false
// positives from embedded Facebook/share widgets.
const GENERIC_LINK_PATHS = ["sharer", "share.php", "/plugins/", "/dialog/", "/policy", "/help"];

function extractSocialLink(html: string, domain: string): string | null {
  const escaped = domain.replace(/\./g, "\\.");
  const pattern = new RegExp(`href=["'](https?://(?:www\\.)?${escaped}/[^"']+)["']`, "i");
  const match = html.match(pattern);
  if (!match) return null;

  const link = match[1];
  if (GENERIC_LINK_PATHS.some((p) => link.includes(p))) return null;
  return link;
}
