"use client";

// Tab for running experiments and viewing results.
import { useState } from "react";
import { Play, Download } from "lucide-react";
import { useStore } from "@/lib/store";
import type { ExperimentResult } from "@/lib/types";

function sameGraderSet(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) if (!b.has(id)) return false;
  return true;
}

export function ExperimentTab() {
  const {
    datasets,
    graders,
    getDataset,
    getGrader,
    setResults,
  } = useStore();
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [selectedGraderIds, setSelectedGraderIds] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [runResults, setRunResults] = useState<ExperimentResult[]>([]);
  const [lastRunDatasetId, setLastRunDatasetId] = useState<string>("");
  const [lastRunGraderIds, setLastRunGraderIds] = useState<Set<string>>(new Set());

  const selectedDataset = selectedDatasetId
    ? getDataset(selectedDatasetId)
    : undefined;

  const toggleGrader = (id: string) => {
    setSelectedGraderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runExperiment = async () => {
    if (!selectedDataset || selectedGraderIds.size === 0) return;
    setRunning(true);
    try {
      const newResults: ExperimentResult[] = [];
      for (const tc of selectedDataset.testCases) {
        for (const graderId of Array.from(selectedGraderIds)) {
          const grader = getGrader(graderId);
          if (!grader) continue;
          const res = await fetch("/api/grade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input: tc.input,
              expected_output: tc.expected_output,
              rubric: grader.rubric,
              graderName: grader.name,
            }),
          });
          const data = await res.json();
          if (res.ok) {
            newResults.push({
              testCaseId: tc.id,
              graderId,
              pass: data.pass,
              reason: data.reason ?? "",
              ...(data.generated_output !== undefined && { generated_output: data.generated_output }),
            });
          }
        }
      }
      setRunResults(newResults);
      setLastRunDatasetId(selectedDatasetId);
      setLastRunGraderIds(new Set(selectedGraderIds));
      await setResults(newResults);
    } finally {
      setRunning(false);
    }
  };

  const selectedGraders = graders.filter((g) => selectedGraderIds.has(g.id));
  const showResultsTable =
    runResults.length > 0 &&
    selectedDatasetId === lastRunDatasetId &&
    sameGraderSet(selectedGraderIds, lastRunGraderIds);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[var(--border)] space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">
              Dataset
            </label>
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="bg-[var(--surface)] border border-[var(--border)] rounded px-3 py-2 text-sm min-w-[200px]"
            >
              <option value="">Select dataset...</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.testCases.length} cases)
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs text-[var(--muted)] mb-1">
              Graders
            </label>
            <div className="flex flex-wrap gap-2">
              {graders.map((g) => (
                <label
                  key={g.id}
                  className="flex items-center gap-2 px-3 py-2 rounded border border-[var(--border)] cursor-pointer hover:border-[var(--muted)] has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent)]/10"
                >
                  <input
                    type="checkbox"
                    checked={selectedGraderIds.has(g.id)}
                    onChange={() => toggleGrader(g.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{g.name}</span>
                </label>
              ))}
            </div>
          </div>
          <button
            onClick={runExperiment}
            disabled={
              running || !selectedDataset || selectedGraderIds.size === 0
            }
            className="flex items-center gap-2 px-4 py-2 rounded bg-[var(--accent)] text-[var(--bg)] font-medium hover:bg-[var(--accent-dim)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play size={16} />
            {running ? "Running…" : "Run"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {showResultsTable && selectedDataset ? (
          <>
            <StatsBar results={runResults} graders={selectedGraders} />
            <div className="flex justify-end">
              <ExportButton
                dataset={selectedDataset}
                graders={selectedGraders}
                results={runResults}
              />
            </div>
            <ResultsTable
              dataset={selectedDataset}
              graders={selectedGraders}
              results={runResults}
            />
          </>
        ) : (
          <div className="text-center text-[var(--muted)] py-16">
            Select a dataset and graders, then click Run to evaluate.
          </div>
        )}
      </div>
    </div>
  );
}

// Table of test cases with grader columns.
function ResultsTable({
  dataset,
  graders,
  results,
}: {
  dataset: { testCases: { id: string; input: string; expected_output: string }[] };
  graders: { id: string; name: string }[];
  results: ExperimentResult[];
}) {
  const getResult = (testCaseId: string, graderId: string) =>
    results.find(
      (r) => r.testCaseId === testCaseId && r.graderId === graderId
    );

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
              <th className="text-left px-3 py-2 font-medium sticky left-0 bg-[var(--surface)] min-w-[120px]">
                input
              </th>
              <th className="text-left px-3 py-2 font-medium min-w-[120px]">
                expected_output
              </th>
              {graders.map((g) => (
                <th
                  key={g.id}
                  className="text-center px-3 py-2 font-medium min-w-[100px]"
                >
                  {g.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataset.testCases.map((tc) => (
              <tr
                key={tc.id}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)]/50"
              >
                <td
                  className="px-3 py-2 max-w-[200px] truncate sticky left-0 bg-[var(--bg)]"
                  title={tc.input}
                >
                  {tc.input || "—"}
                </td>
                <td
                  className="px-3 py-2 max-w-[200px] truncate"
                  title={tc.expected_output}
                >
                  {tc.expected_output || "—"}
                </td>
                {graders.map((g) => {
                  const r = getResult(tc.id, g.id);
                  return (
                    <td key={g.id} className="px-3 py-2 text-center">
                      {r ? (
                        <ResultCell pass={r.pass} reason={r.reason} />
                      ) : (
                        "—"
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs text-[var(--muted)]">
        Failed cells show the reason below. Export includes Overview sheet with pass rates.
      </div>
    </div>
  );
}

// Single result cell. Pass/fail badge; reason on hover (per acceptance criteria).
function ResultCell({ pass, reason }: { pass: boolean; reason: string }) {
  return (
    <div
      className="flex flex-col gap-0.5 items-center text-center min-w-[80px] cursor-default"
      title={reason || (pass ? "Pass" : "Fail")}
    >
      <span
        className={`
          inline-block px-2 py-0.5 rounded text-xs font-medium
          ${pass ? "bg-[var(--pass)]/20 text-[var(--pass)]" : "bg-[var(--fail)]/20 text-[var(--fail)]"}
        `}
      >
        {pass ? "Pass" : "Fail"}
      </span>
      {!pass && reason && (
        <span className="text-[10px] text-[var(--muted)] leading-tight max-w-[180px]">
          {reason}
        </span>
      )}
    </div>
  );
}

// Pass rate summary per grader.
function StatsBar({
  results,
  graders,
}: {
  results: ExperimentResult[];
  graders: { id: string; name: string }[];
}) {
  const stats = graders.map((g) => {
    const graderResults = results.filter((r) => r.graderId === g.id);
    const passCount = graderResults.filter((r) => r.pass).length;
    const total = graderResults.length;
    const rate = total > 0 ? ((passCount / total) * 100).toFixed(1) : "0";
    return { name: g.name, passCount, total, rate };
  });

  return (
    <div className="flex flex-wrap gap-4 p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
      {stats.map((s) => (
        <div key={s.name} className="text-sm">
          <span className="font-medium">{s.name}:</span>{" "}
          <span className="text-[var(--muted)]">
            {s.passCount}/{s.total} ({s.rate}% pass)
          </span>
        </div>
      ))}
    </div>
  );
}

// Export as CSV.
function ExportButton({
  dataset,
  graders,
  results,
}: {
  dataset: { testCases: { id: string; input: string; expected_output: string }[] };
  graders: { id: string; name: string }[];
  results: ExperimentResult[];
}) {
  const getResult = (testCaseId: string, graderId: string) =>
    results.find(
      (r) => r.testCaseId === testCaseId && r.graderId === graderId
    );

  const escapeCsv = (s: string) => {
    const t = String(s ?? "").replace(/"/g, '""');
    return t.includes(",") || t.includes('"') || t.includes("\n") ? `"${t}"` : t;
  };

  const downloadCsv = () => {
    const headers = ["input", "expected_output", ...graders.flatMap((g) => [`${g.name}_pass`, `${g.name}_reason`, `${g.name}_generated`])];
    const rows = dataset.testCases.map((tc) => {
      const row = [
        escapeCsv(tc.input ?? ""),
        escapeCsv(tc.expected_output ?? ""),
        ...graders.flatMap((g) => {
          const r = getResult(tc.id, g.id);
          return [escapeCsv(r?.pass ? "pass" : "fail"), escapeCsv(r?.reason ?? ""), escapeCsv(r?.generated_output ?? "")];
        }),
      ];
      return row.join(",");
    });
    const csv = [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "eval-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={downloadCsv}
      className="flex items-center gap-2 px-3 py-2 rounded border border-[var(--border)] text-sm hover:bg-[var(--surface)] transition-colors"
    >
      <Download size={16} /> Export
    </button>
  );
}
