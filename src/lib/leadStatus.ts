export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  quoted: "Quoted",
  not_interested: "Not Interested",
  customer: "Customer",
};

// How a lead reached us — shown on the manual "+ New Lead" form and
// backfilled onto every pre-existing lead (all of which came through the
// Google Places search, the only intake path that existed before this).
export const LEAD_INTAKE_SOURCE_LABELS: Record<string, string> = {
  phone_call: "Phone Call",
  text_message: "Text Message",
  walk_in: "Walk-in",
  referral: "Referral",
  google_places_search: "Google Places Search",
  website: "Website",
};
