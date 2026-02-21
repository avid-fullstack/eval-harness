"use client";

// Main page: header, tabs, and tab content.
import { useState } from "react";
import { Tabs } from "@/components/Tabs";
import { DatasetTab } from "@/components/DatasetTab";
import { GradersTab } from "@/components/GradersTab";
import { ExperimentTab } from "@/components/ExperimentTab";
import { useStore } from "@/lib/store";

type TabId = "dataset" | "graders" | "experiment";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("dataset");
  const { isHydrating, isSaving, isExperimentRunning } = useStore();
  const busy = isHydrating || isSaving || isExperimentRunning;

  const busyMessage = isHydrating
    ? "Loading…"
    : isExperimentRunning
      ? "Running experiment…"
      : "Saving…";

  return (
    <div className="h-screen flex flex-col bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">Eval Harness</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          Run graders against test cases
        </p>
      </header>
      <Tabs active={activeTab} onChange={setActiveTab} disabled={busy} />
      <main className="flex-1 overflow-hidden relative">
        {activeTab === "dataset" && <DatasetTab />}
        {activeTab === "graders" && <GradersTab />}
        {activeTab === "experiment" && <ExperimentTab />}
        {busy && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--bg)]/80"
            aria-live="polite"
            aria-busy="true"
          >
            <div
              className="h-8 w-8 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin"
              aria-hidden
            />
            <p className="mt-3 text-sm text-[var(--muted)]">{busyMessage}</p>
          </div>
        )}
      </main>
    </div>
  );
}
