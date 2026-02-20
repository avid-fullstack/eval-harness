"use client";

// Main page: header, tabs, and tab content.
import { useState } from "react";
import { Tabs } from "@/components/Tabs";
import { DatasetTab } from "@/components/DatasetTab";
import { GradersTab } from "@/components/GradersTab";
import { ExperimentTab } from "@/components/ExperimentTab";

type TabId = "dataset" | "graders" | "experiment";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("dataset");

  return (
    <div className="h-screen flex flex-col bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">Eval Harness</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          Run graders against test cases
        </p>
      </header>
      <Tabs active={activeTab} onChange={setActiveTab} />
      <main className="flex-1 overflow-hidden">
        {activeTab === "dataset" && <DatasetTab />}
        {activeTab === "graders" && <GradersTab />}
        {activeTab === "experiment" && <ExperimentTab />}
      </main>
    </div>
  );
}
