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
  const { isHydrating } = useStore();
  // Tabs stay switchable during load and save; only the active tab's content shows a local spinner when that tab is saving/loading.
  const tabsDisabled = false;

  return (
    <div className="h-screen flex flex-col bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">Eval Harness</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          Run graders against test cases
        </p>
      </header>
      <Tabs active={activeTab} onChange={setActiveTab} disabled={tabsDisabled} />
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {/* Keep all tabs mounted and hide inactive with CSS so state (selections, form inputs) persists across tab switches (in-memory). */}
        <div className={activeTab === "dataset" ? "flex-1 overflow-hidden flex flex-col h-full" : "hidden"}>
          <DatasetTab />
        </div>
        <div className={activeTab === "graders" ? "flex-1 overflow-hidden flex flex-col h-full" : "hidden"}>
          <GradersTab />
        </div>
        <div className={activeTab === "experiment" ? "flex-1 overflow-hidden flex flex-col h-full" : "hidden"}>
          <ExperimentTab />
        </div>
        {isHydrating && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--bg)]/80"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="h-8 w-8 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" aria-hidden />
            <p className="mt-3 text-sm text-[var(--muted)]">Loading…</p>
          </div>
        )}
      </main>
    </div>
  );
}
