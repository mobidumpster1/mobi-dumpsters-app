"use client";

import { useEffect } from "react";

const COOKIE_NAME = "mobi_referral_code";
const THIRTY_DAYS = 30 * 24 * 60 * 60;

// Silently records a referral code from a ?ref= link, so a booking
// submitted later — even after browsing around first — can still be
// attributed to whoever shared the link. Renders nothing; just runs once
// on page load. Kept separate from UtmCapture to preserve its single
// responsibility.
export function ReferralCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;

    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(ref)}; max-age=${THIRTY_DAYS}; path=/`;
  }, []);

  return null;
}
