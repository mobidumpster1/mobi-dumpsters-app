import { EquipmentTabs } from "@/components/EquipmentTabs";

export const dynamic = "force-dynamic";

export default function EquipmentTrackingPage() {
  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">Equipment Tracking</h1>
        <p className="mt-1 text-zinc-500">
          Live GPS location for trucks and equipment, once a provider is connected.
        </p>
      </div>

      <div className="mt-6">
        <EquipmentTabs />
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
        <p className="font-medium text-zinc-700">Not connected yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
          This page will show live map positions for your trucks and equipment
          once a GPS tracking provider (e.g. One Step GPS, Traccar, Spytec, or
          Samsara) is picked and wired in. The Mileage Log already has a spot
          reserved for GPS-sourced entries, so trip logging won&rsquo;t need to
          change when this is connected.
        </p>
      </div>
    </div>
  );
}
