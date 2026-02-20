# Eval Harness

Lightweight eval harness for running graders against test cases. Create datasets, define graders with rubrics, run experiments, and review pass/fail results.

## User Flow

1. **Create a dataset** – In the Dataset tab, add test cases with `input` and `expected_output` (and optionally add/delete datasets).
2. **Define graders** – In the Graders tab, create evaluation criteria (name, description, rubric).
3. **Run an experiment** – In the Experiment tab, select a dataset and one or more graders, then click **Run**.
4. **Review results** – The results table appears only after a run completes. Each row is a test case; each grader is a column with pass/fail and reason (hover for full reason). Stats and CSV export are available.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

- **`DATABASE_URL`** (optional but recommended): PostgreSQL connection string (e.g. `postgresql://user:password@localhost:5432/eval_harness`). If set, data is persisted; tables are created automatically. If not set, save operations (add/edit/delete dataset, grader, or run results) will show an error asking you to set `DATABASE_URL`.
- **`OPENAI_API_KEY`** (optional): When set, the grade API uses a **generate-then-grade** flow (see below). Without it, a mock grader is used.

### Tests

```bash
npm test
```

Tests cover the grade API (mock path), data API (mocked db), and Tabs component. No real database or API keys required.

## Features

- **Dataset tab**: CRUD for datasets and test case rows (input, expected_output).
- **Graders tab**: CRUD for grader definitions (name, description, rubric).
- **Experiment tab**: Select a dataset and graders, click Run. Results table is shown only after a run (not from existing DB results); changing selection hides the table until you run again.
- **Results**: Pass/fail per cell, reason on hover; aggregate pass rate per grader; CSV export (pass, reason, generated output per grader).
- **Persistence**: When `DATABASE_URL` is set, every add/edit/delete is saved to the database before the UI updates (real-time sync). The DB is updated incrementally (upsert/delete only what changed), so unmodified data is preserved.

## AI-based grading

Set `OPENAI_API_KEY` in `.env.local` to enable AI grading. The `/api/grade` route uses GPT-4o-mini in a **generate-then-grade** flow:

1. **Generate**: The model produces an answer from the test case input.
2. **Grade**: The model compares expected output vs generated output against the rubric and returns pass/fail, reason, and (when generated) the model output.

Without the API key, a mock grader runs (no generation; pass/fail based on whether input and expected output are non-empty).
