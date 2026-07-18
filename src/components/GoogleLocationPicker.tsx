"use client";

import { useState } from "react";
import { fetchAvailableLocations, chooseLocation } from "@/app/(internal)/reviews/actions";

export function GoogleLocationPicker() {
  const [locations, setLocations] = useState<{ name: string; title: string }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLoad() {
    setLoading(true);
    setError(null);
    try {
      setLocations(await fetchAvailableLocations());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load locations.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(location: { name: string; title: string }) {
    setSaving(true);
    setError(null);
    try {
      await chooseLocation(location.name, location.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't select that location.");
    } finally {
      setSaving(false);
    }
  }

  if (!locations) {
    return (
      <div>
        <p className="text-sm text-zinc-600">
          Connected — now pick which Business Profile location to sync reviews from.
        </p>
        <button
          type="button"
          onClick={handleLoad}
          disabled={loading}
          className="mt-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "Loading…" : "Load Locations"}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {locations.map((loc) => (
        <button
          key={loc.name}
          type="button"
          onClick={() => handleSelect(loc)}
          disabled={saving}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
        >
          {loc.title}
        </button>
      ))}
      {locations.length === 0 && (
        <p className="text-sm text-zinc-400">No locations found on this Google Business account.</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
