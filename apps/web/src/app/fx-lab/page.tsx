import type { Metadata } from "next";
import { FxLab } from "@/components/fx/FxLab";

export const metadata: Metadata = { title: "Effects lab" };

export default function FxLabPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl md:text-4xl">Effects lab</h1>
      <p className="mt-2 max-w-prose text-text-muted">
        Preview the anime-style effects used in AIForge's games and banners. Pick an effect, slow it down, or pause on
        a frame to study it. Your effects level and reduced-motion settings apply here too.
      </p>
      <div className="mt-6">
        <FxLab />
      </div>
    </div>
  );
}
