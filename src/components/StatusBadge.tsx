import { formatEquipmentStatus } from "@/lib/equipmentStatus";

const STATUS_STYLES: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  reserved: "bg-blue-100 text-blue-700",
  out_on_job: "bg-amber-100 text-amber-700",
  in_transit: "bg-purple-100 text-purple-700",
  needs_repair: "bg-red-100 text-red-700",
  retired: "bg-zinc-200 text-zinc-600",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-600";
  const label = formatEquipmentStatus(status);
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}
