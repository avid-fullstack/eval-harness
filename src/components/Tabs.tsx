"use client";

// Tab navigation bar.
type TabId = "dataset" | "graders" | "experiment";

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: "dataset", label: "Dataset" },
  { id: "graders", label: "Graders" },
  { id: "experiment", label: "Experiment" },
];

export function Tabs({
  active,
  onChange,
  disabled = false,
}: {
  active: TabId;
  onChange: (id: TabId) => void;
  disabled?: boolean;
}) {
  return (
    <nav className="flex gap-1 border-b border-[var(--border)] px-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onChange(tab.id)}
          className={`
            px-4 py-3 text-sm font-medium transition-colors
            -mb-px border-b-2
            disabled:pointer-events-none disabled:opacity-60
            ${
              active === tab.id
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }
          `}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
