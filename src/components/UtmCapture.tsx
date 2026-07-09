"use client";

import { useEffect } from "react";

const COOKIE_NAME = "mobi_utm_source";
const THIRTY_DAYS = 30 * 24 * 60 * 60;

// Silently records which ad (if any) brought this visitor in, so a booking
// submitted later — even after browsing around first — can still be
// attributed correctly. Renders nothing; just runs once on page load.
// Last-touch: a newer tagged visit overwrites an older one, matching how
// Google/Meta themselves attribute conversions.
export function UtmCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("utm_source");
    if (!source) return;

    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(source)}; max-age=${THIRTY_DAYS}; path=/`;
  }, []);

  return null;
}
