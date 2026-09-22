import dns from "node:dns";
import net from "node:net";

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
const MAX_REDIRECTS = 5;

// Blocks fetches to loopback, link-local (including the 169.254.169.254
// cloud metadata address), and private/internal ranges — a lead's
// "website" field is untrusted user-adjacent input (scraped off Google
// Places or typed by staff), so without this a crafted URL could make the
// server fetch its own internal network instead of a real business site.
function isPrivateOrReservedIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 0) return true; // "this network"
    return false;
  }
  if (family === 6) {
    const normalized = ip.toLowerCase();
    if (normalized === "::1") return true; // loopback
    if (normalized.startsWith("fe80:")) return true; // link-local
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique-local
    if (normalized.startsWith("::ffff:")) {
      // IPv4-mapped IPv6 — re-check the embedded v4 address.
      return isPrivateOrReservedIp(normalized.replace("::ffff:", ""));
    }
    return false;
  }
  return true; // not a parseable IP at all — treat as unsafe rather than guess
}

async function isSafeToFetch(url: URL): Promise<boolean> {
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  try {
    const addresses = await dns.promises.lookup(url.hostname, { all: true });
    return addresses.length > 0 && addresses.every((a) => !isPrivateOrReservedIp(a.address));
  } catch {
    return false; // DNS failure — nothing to fetch, don't guess
  }
}

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

  try {
    // Followed manually (not fetch's redirect:"follow") so every hop —
    // not just the first URL — is re-validated against internal/private
    // IP ranges before being requested.
    let response: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!(await isSafeToFetch(url))) return EMPTY_RESULT;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadEnrichmentBot/1.0)" },
          redirect: "manual",
        });
      } finally {
        clearTimeout(timeout);
      }

      if (response.status < 300 || response.status >= 400) break;
      const location = response.headers.get("location");
      if (!location) return EMPTY_RESULT;
      try {
        url = new URL(location, url);
      } catch {
        return EMPTY_RESULT;
      }
      response = null;
    }
    if (!response || !response.ok) return EMPTY_RESULT;

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
