import type { Metadata } from "next";
import { WorldMapView } from "@/components/map/WorldMapView";

export const metadata: Metadata = { title: "World map" };

export default function MapPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl md:text-4xl">World map</h1>
      <p className="mt-2 max-w-prose text-text-muted">
        23 realms from your first line of Python to a production AI system. Every realm is open to look at; the
        ones marked coming soon are still being built.
      </p>
      <div className="mt-6">
        <WorldMapView />
      </div>
    </div>
  );
}
