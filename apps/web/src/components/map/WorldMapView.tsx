"use client";

import { BIOMES } from "@aiforge/games";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RealmPath } from "@/components/home/RealmPath";
import { MAP_REALMS } from "@/lib/map-data";
import { REALMS } from "@/lib/realms";

// The map (and with it Phaser, about 1.4 MB) is only downloaded when it is shown.
const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => <p className="p-6 text-text-muted">Loading the map...</p>,
});

type View = "map" | "list";
const STORAGE_KEY = "aiforge-map-view";

/** World map with an equivalent list view. The list is the accessible alternative and the fallback. */
export function WorldMapView() {
  const [view, setView] = useState<View | null>(null);
  const [focused, setFocused] = useState<number>(2);
  const [error, setError] = useState<string | null>(null);
  const realms = useMemo(() => MAP_REALMS, []);

  // Choose the starting view once, on the client: the saved choice, else the map on roomy screens.
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* storage blocked */ }
    setView(saved === "map" || saved === "list" ? saved : window.matchMedia("(min-width: 640px)").matches ? "map" : "list");
  }, []);

  function choose(next: View) {
    setView(next);
    setError(null);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  }

  const onError = useCallback((message: string) => {
    setError(message);
    setView("list"); // never leave the learner without a way to navigate
  }, []);

  const onSelect = useCallback((n: number) => setFocused(n), []);

  const realm = REALMS[focused - 1];
  const biome = BIOMES[focused - 1];
  const tab = "tap rounded-[var(--radius)] border-2 px-4 font-semibold";

  return (
    <div>
      <div role="group" aria-label="Choose how to view the map" className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={view === "map"} onClick={() => choose("map")}
          className={`${tab} ${view === "map" ? "border-primary bg-primary text-on-primary" : "border-border bg-surface text-text"}`}>
          Map view
        </button>
        <button type="button" aria-pressed={view === "list"} onClick={() => choose("list")}
          className={`${tab} ${view === "list" ? "border-primary bg-primary text-on-primary" : "border-border bg-surface text-text"}`}>
          List view
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-[var(--radius)] border-2 border-danger bg-surface p-3">
          The graphical map could not start in this browser ({error}). The list shows the same realms.
        </p>
      )}

      {view === null && <p className="mt-4 text-text-muted">Loading...</p>}

      {view === "map" && (
        <div className="mt-4">
          <MapCanvas realms={realms} onFocus={setFocused} onSelect={onSelect} onError={onError} />
          <p className="mt-2 text-sm text-text-muted">
            Drag or scroll to explore. Click a realm, or focus the map and use the arrow keys and Enter.
          </p>
          {realm && biome && (
            <section aria-live="polite" aria-labelledby="map-selected" className="mt-4 rounded-[var(--radius)] border border-border bg-surface p-4">
              <h2 id="map-selected" className="text-xl">
                Realm {realm.n}: {realm.name}
              </h2>
              <p className="text-sm text-text-muted">{biome.name}</p>
              <p className="mt-1">{realm.blurb}</p>
              {realm.quest ? (
                <Link href={`/quests/${realm.quest}/`} className="tap mt-3 inline-flex items-center rounded-[var(--radius)] bg-primary px-5 font-bold text-on-primary no-underline">
                  Start this quest
                </Link>
              ) : (
                <p className="mt-2 font-semibold">Coming soon. It is being built one day at a time.</p>
              )}
            </section>
          )}
        </div>
      )}

      {view === "list" && <RealmPath />}
    </div>
  );
}
