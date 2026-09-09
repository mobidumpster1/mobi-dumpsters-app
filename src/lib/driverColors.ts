// A stable color per driver on the calendar, so the same person always
// shows the same color across day/week/month views without needing a
// stored color preference — the driverId is hashed into a fixed palette
// index. Deliberately not user-customizable (no schema for it); revisit
// only if a real need for picking colors shows up.
const PALETTE = [
  { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500" },
  { bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500" },
  { bg: "bg-pink-100", text: "text-pink-800", dot: "bg-pink-500" },
  { bg: "bg-teal-100", text: "text-teal-800", dot: "bg-teal-500" },
  { bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500" },
  { bg: "bg-cyan-100", text: "text-cyan-800", dot: "bg-cyan-500" },
  { bg: "bg-indigo-100", text: "text-indigo-800", dot: "bg-indigo-500" },
  { bg: "bg-rose-100", text: "text-rose-800", dot: "bg-rose-500" },
];

// Unassigned jobs keep the existing delivery/return green/amber distinction
// instead of a driver color — there's no driver to color-code by.
const UNASSIGNED = { bg: "", text: "", dot: "bg-zinc-300" };

function hashToIndex(id: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % length;
}

export function getDriverColor(driverId: string | null): { bg: string; text: string; dot: string } {
  if (!driverId) return UNASSIGNED;
  return PALETTE[hashToIndex(driverId, PALETTE.length)];
}
