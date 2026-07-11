import { formatEquipmentStatus } from "@/lib/equipmentStatus";

const STATUS_STYLES: Record<string, string> = {
  available: "bg-green-600 text-white",
  reserved: "bg-blue-600 text-white",
  out_on_job: "bg-amber-500 text-white",
  in_transit: "bg-purple-600 text-white",
  needs_repair: "bg-red-600 text-white",
  retired: "bg-zinc-500 text-white",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-zinc-500 text-white";
  const label = formatEquipmentStatus(status);
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-black ${style}`}
    >
      {label}
    </span>
  );
}
