// Tags every lead the standalone Prospecting tool creates, so its list
// stays a distinct, lighter slice of the same Lead table the main /leads
// search writes to — findable on its own, but still visible/usable from
// the full pipeline if a saved company needs more done with it later.
export const PROSPECT_SOURCE = "prospecting_tool";
