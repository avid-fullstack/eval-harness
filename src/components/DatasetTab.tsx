"use client";

// Tab for managing datasets and test cases.
import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { TestCase } from "@/lib/types";

export function DatasetTab() {
  const {
    datasets,
    addDataset,
    updateDataset,
    deleteDataset,
    addTestCase,
    updateTestCase,
    deleteTestCase,
  } = useStore();

  const [selectedId, setSelectedId] = useState<string | null>(
    datasets[0]?.id ?? null
  );
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const selected = datasets.find((d) => d.id === selectedId) ?? datasets[0];

  // Adding a dataset and selecting it.
  const handleAddDataset = () => {
    const name = newName.trim() || "New Dataset";
    const ds = addDataset(name);
    setSelectedId(ds.id);
    setNewName("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
        <select
          value={selected?.id ?? ""}
          onChange={(e) => setSelectedId(e.target.value || null)}
          className="bg-[var(--surface)] border border-[var(--border)] rounded px-3 py-2 text-sm min-w-[200px]"
        >
          <option value="">Select a dataset...</option>
          {datasets.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.testCases.length} cases)
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Dataset name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddDataset()}
            className="bg-[var(--surface)] border border-[var(--border)] rounded px-3 py-2 text-sm w-48"
          />
          <button
            onClick={handleAddDataset}
            className="flex items-center gap-2 px-3 py-2 rounded bg-[var(--accent)] text-[var(--bg)] font-medium hover:bg-[var(--accent-dim)] transition-colors"
          >
            <Plus size={16} /> Add
          </button>
        </div>
        {selected && (
          <button
            onClick={() => deleteDataset(selected.id)}
            className="text-[var(--fail)] hover:underline text-sm ml-auto"
          >
            Delete dataset
          </button>
        )}
      </div>

      {selected ? (
        <>
          <div className="flex-1 overflow-auto p-4">
            <div className="border border-[var(--border)] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                    <th className="text-left px-3 py-2 font-medium">input</th>
                    <th className="text-left px-3 py-2 font-medium">
                      expected_output
                    </th>
                    <th className="w-20 px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {selected.testCases.map((tc) => (
                    <TestCaseRow
                      key={tc.id}
                      testCase={tc}
                      editing={editingRow === tc.id}
                      onEdit={() => setEditingRow(tc.id)}
                      onSave={(updates) => {
                        updateTestCase(selected.id, tc.id, updates);
                        setEditingRow(null);
                      }}
                      onCancel={() => setEditingRow(null)}
                      onDelete={() => deleteTestCase(selected.id, tc.id)}
                    />
                  ))}
                  <AddRow
                    onAdd={(tc) => {
                      addTestCase(selected.id, tc);
                    }}
                  />
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[var(--muted)]">
          Add a dataset to get started
        </div>
      )}
    </div>
  );
}

// Row for one test case. Inline edit or view mode.
function TestCaseRow({
  testCase,
  editing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: {
  testCase: TestCase;
  editing: boolean;
  onEdit: () => void;
  onSave: (updates: Partial<TestCase>) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [input, setInput] = useState(testCase.input);
  const [expected, setExpected] = useState(testCase.expected_output);

  if (editing) {
    return (
      <tr className="border-b border-[var(--border)] last:border-0">
        <td className="px-3 py-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-sm min-h-[60px] resize-y"
            autoFocus
          />
        </td>
        <td className="px-3 py-2">
          <textarea
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-sm min-h-[60px] resize-y"
          />
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-1">
            <button
              onClick={() => onSave({ input, expected_output: expected })}
              className="p-1.5 rounded text-[var(--pass)] hover:bg-[var(--surface)]"
            >
              <Check size={16} />
            </button>
            <button
              onClick={onCancel}
              className="p-1.5 rounded text-[var(--muted)] hover:bg-[var(--surface)]"
            >
              <X size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)]/50">
      <td className="px-3 py-2 max-w-[300px] truncate" title={testCase.input}>
        {testCase.input || "—"}
      </td>
      <td className="px-3 py-2 max-w-[300px] truncate" title={testCase.expected_output}>
        {testCase.expected_output || "—"}
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 rounded text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--fail)]"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// Inline form for adding a new test case row.
function AddRow({ onAdd }: { onAdd: (tc: Omit<TestCase, "id">) => void }) {
  const [input, setInput] = useState("");
  const [expected, setExpected] = useState("");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <tr>
        <td colSpan={3} className="px-3 py-2">
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--accent)] text-sm"
          >
            <Plus size={16} /> Add row
          </button>
        </td>
      </tr>
    );
  }

  // Submitting the new row and resetting the form.
  const handleAdd = () => {
    onAdd({ input: input.trim(), expected_output: expected.trim() });
    setInput("");
    setExpected("");
    setOpen(false);
  };

  return (
    <tr className="border-t-2 border-dashed border-[var(--border)]">
      <td className="px-3 py-2">
        <textarea
          placeholder="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-sm min-h-[60px] resize-y"
          autoFocus
        />
      </td>
      <td className="px-3 py-2">
        <textarea
          placeholder="expected_output"
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-sm min-h-[60px] resize-y"
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--pass)] text-[var(--bg)] text-sm font-medium"
          >
            <Check size={14} /> Add
          </button>
          <button
            onClick={() => {
              setOpen(false);
              setInput("");
              setExpected("");
            }}
            className="p-1.5 rounded text-[var(--muted)] hover:bg-[var(--surface)]"
          >
            <X size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}
