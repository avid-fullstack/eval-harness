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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = datasets.find((d) => d.id === selectedId) ?? datasets[0];

  const handleAddDataset = async () => {
    const name = newName.trim() || "New Dataset";
    setError(null);
    setSaving(true);
    try {
      const ds = await addDataset(name);
      setSelectedId(ds.id);
      setNewName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDataset = async () => {
    if (!selected) return;
    setError(null);
    setSaving(true);
    try {
      await deleteDataset(selected.id);
      setSelectedId(datasets.find((d) => d.id !== selected.id)?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
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
            disabled={saving}
            className="flex items-center gap-2 px-3 py-2 rounded bg-[var(--accent)] text-[var(--bg)] font-medium hover:bg-[var(--accent-dim)] disabled:opacity-50 transition-colors"
          >
            <Plus size={16} /> {saving ? "Saving…" : "Add"}
          </button>
        </div>
        {error && (
          <span className="text-sm text-[var(--fail)]">{error}</span>
        )}
        {selected && (
          <button
            onClick={handleDeleteDataset}
            disabled={saving}
            className="text-[var(--fail)] hover:underline text-sm ml-auto disabled:opacity-50"
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
                      disabled={saving}
                      onEdit={() => setEditingRow(tc.id)}
                      onSave={async (updates) => {
                        setError(null);
                        setSaving(true);
                        try {
                          await updateTestCase(selected.id, tc.id, updates);
                          setEditingRow(null);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Failed to save");
                        } finally {
                          setSaving(false);
                        }
                      }}
                      onCancel={() => setEditingRow(null)}
                      onDelete={async () => {
                        setError(null);
                        setSaving(true);
                        try {
                          await deleteTestCase(selected.id, tc.id);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Failed to delete");
                        } finally {
                          setSaving(false);
                        }
                      }}
                    />
                  ))}
                  <AddRow
                    onAdd={async (tc) => {
                      setError(null);
                      setSaving(true);
                      try {
                        await addTestCase(selected.id, tc);
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Failed to save");
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
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
  disabled,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: {
  testCase: TestCase;
  editing: boolean;
  disabled?: boolean;
  onEdit: () => void;
  onSave: (updates: Partial<TestCase>) => void | Promise<void>;
  onCancel: () => void;
  onDelete: () => void | Promise<void>;
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
              disabled={disabled}
              className="p-1.5 rounded text-[var(--pass)] hover:bg-[var(--surface)] disabled:opacity-50"
            >
              <Check size={16} />
            </button>
            <button
              onClick={onCancel}
              disabled={disabled}
              className="p-1.5 rounded text-[var(--muted)] hover:bg-[var(--surface)] disabled:opacity-50"
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
            disabled={disabled}
            className="p-1.5 rounded text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] disabled:opacity-50"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            disabled={disabled}
            className="p-1.5 rounded text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--fail)] disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// Inline form for adding a new test case row.
function AddRow({
  onAdd,
  disabled,
}: {
  onAdd: (tc: Omit<TestCase, "id">) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [input, setInput] = useState("");
  const [expected, setExpected] = useState("");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <tr>
        <td colSpan={3} className="px-3 py-2">
          <button
            onClick={() => setOpen(true)}
            disabled={disabled}
            className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--accent)] text-sm disabled:opacity-50"
          >
            <Plus size={16} /> Add row
          </button>
        </td>
      </tr>
    );
  }

  const handleAdd = async () => {
    await onAdd({ input: input.trim(), expected_output: expected.trim() });
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
            disabled={disabled}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--pass)] text-[var(--bg)] text-sm font-medium disabled:opacity-50"
          >
            <Check size={14} /> Add
          </button>
          <button
            onClick={() => {
              setOpen(false);
              setInput("");
              setExpected("");
            }}
            disabled={disabled}
            className="p-1.5 rounded text-[var(--muted)] hover:bg-[var(--surface)] disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}
