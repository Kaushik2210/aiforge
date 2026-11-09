import type { Metadata } from "next";
import { SettingsPanel } from "@/components/progress/SettingsPanel";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl md:text-4xl">Settings and progress</h1>
      <p className="mt-2 text-text-muted">
        AIForge has no accounts. Your progress lives in this browser; export it to back it up.
      </p>
      <div className="mt-6">
        <SettingsPanel />
      </div>
    </div>
  );
}
