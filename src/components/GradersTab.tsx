"use client";

// Tab for managing grader definitions.
import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Grader } from "@/lib/types";

export function GradersTab() {
  const { graders, addGrader, updateGrader, deleteGrader } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        <h2 className="text-lg font-medium">Grader definitions</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-3 py-2 rounded bg-[var(--accent)] text-[var(--bg)] font-medium hover:bg-[var(--accent-dim)] transition-colors"
        >
          <Plus size={16} /> Add grader
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {graders.map((grader) => (
          <GraderCard
            key={grader.id}
            grader={grader}
            editing={editingId === grader.id}
            onEdit={() => setEditingId(grader.id)}
            onSave={(updates) => {
              updateGrader(grader.id, updates);
              setEditingId(null);
            }}
            onCancel={() => setEditingId(null)}
            onDelete={() => deleteGrader(grader.id)}
          />
        ))}
        {showAdd && (
          <GraderCard
            grader={{ id: "", name: "", description: "", rubric: "" }}
            editing
            onSave={(updates) => {
              addGrader({
                name: updates.name ?? "",
                description: updates.description ?? "",
                rubric: updates.rubric ?? "",
              });
              setShowAdd(false);
            }}
            onCancel={() => setShowAdd(false)}
            onEdit={() => {}}
            onDelete={() => setShowAdd(false)}
          />
        )}
        {graders.length === 0 && !showAdd && (
          <div className="text-center text-[var(--muted)] py-12">
            No graders defined. Add one to evaluate test cases.
          </div>
        )}
      </div>
    </div>
  );
}

// Card for one grader.
function GraderCard({
  grader,
  editing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: {
  grader: Grader;
  editing: boolean;
  onEdit: () => void;
  onSave: (updates: Partial<Grader>) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(grader.name);
  const [description, setDescription] = useState(grader.description);
  const [rubric, setRubric] = useState(grader.rubric);
  const isNew = !grader.id;

  // edit form
  if (editing) {
    return (
      <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--surface)]">
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm font-medium"
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm resize-y"
          />
          <textarea
            placeholder="Rubric (evaluation criteria)"
            value={rubric}
            onChange={(e) => setRubric(e.target.value)}
            rows={4}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-2 text-sm resize-y font-mono"
          />
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onSave({ name, description, rubric })}
            className="flex items-center gap-2 px-3 py-2 rounded bg-[var(--pass)] text-[var(--bg)] font-medium"
          >
            <Check size={14} /> {isNew ? "Create" : "Save"}
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-3 py-2 rounded border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <X size={14} /> Cancel
          </button>
          {!isNew && (
            <button
              onClick={onDelete}
              className="ml-auto text-[var(--fail)] hover:underline text-sm"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[var(--border)] rounded-lg p-4 hover:border-[var(--muted)] transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium">{grader.name || "Unnamed"}</h3>
          {grader.description && (
            <p className="text-sm text-[var(--muted)] mt-1">{grader.description}</p>
          )}
          {grader.rubric && (
            <pre className="mt-2 text-xs font-mono text-[var(--muted)] whitespace-pre-wrap bg-[var(--bg)] rounded p-3">
              {grader.rubric}
            </pre>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-2 rounded text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--fail)]"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
