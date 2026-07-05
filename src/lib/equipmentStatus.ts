export const EQUIPMENT_STATUS_LABELS: Record<string, string> = {
  available: "Available",
  reserved: "Reserved",
  out_on_job: "Out on Job",
  in_transit: "In Transit",
  needs_repair: "Needs Repair",
  retired: "Retired",
};

export function formatEquipmentStatus(status: string): string {
  return EQUIPMENT_STATUS_LABELS[status] ?? status;
}
