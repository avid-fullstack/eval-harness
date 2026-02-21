# Eval Harness

MEMORANG - TAKE HOME ASSIGNMENT

**What's this?** - Lightweight eval harness for running graders against test cases. Create datasets, define graders with rubrics, run experiments, and review pass/fail results.

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

- **`DATABASE_URL`** (optional but recommended): PostgreSQL connection string. If set, data is persisted; tables are created automatically on first load. If not set, save operations will show an error asking you to set `DATABASE_URL`.
- **`OPENAI_API_KEY`** (optional): When set, the grade API uses **OpenAI** for a **generate-then-grade** flow (see below). Without it, a mock grader is used. Optional **`OPENAI_MODEL`** overrides the default model (`gpt-4o-mini`).

### Using Supabase

The app uses standard PostgreSQL (`pg`), so Supabase works without code changes.

1. In the [Supabase Dashboard](https://supabase.com/dashboard), open your project (or create one).
2. Go to **Project Settings** → **Database**.
3. Under **Connection string**, choose **URI** and copy the connection string.
4. For Next.js (serverless API routes), use the **Session mode** (port **6543**) connection string so Supabase’s connection pooler is used and you avoid “too many connections.” If you see both “Direct connection” and “Session pooler,” use the Session pooler URI.
5. Replace the placeholder `[YOUR-PASSWORD]` in the URI with your database password (the one you set when creating the project, or reset it in **Database** → **Database password**).
6. Put the final URL in `.env.local`:
   ```env
   DATABASE_URL=postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
7. Restart the dev server (`npm run dev`). Tables are created automatically when the app first loads or saves data.

### Seeding mock data

With `DATABASE_URL` set, run:

```bash
npm run seed
```

This creates **7 datasets** (Math facts, Geography, Vocabulary, Logic, Science, History, General knowledge), each with **7–8 test cases** and a mix of `expected_output`: correct and concise, correct but verbose (Strict/Format graders may fail these), and incorrect — so you get pass/fail variety and cases where the answer is right but some graders fail it. **5 graders** (Correctness, Strict, Lenient, Format, Completeness). Safe to run multiple times (upserts).

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

Set `OPENAI_API_KEY` in `.env.local` to enable AI grading via [OpenAI](https://platform.openai.com). The `/api/grade` route uses the OpenAI chat completions API in a **generate-then-grade** flow:

1. **Generate**: A chat request sends the test case input; the model’s reply is used as the generated output.
2. **Grade**: A second request sends the rubric and expected vs actual output (system + user message); the model returns JSON with pass/fail and reason.

Default model is `gpt-4o-mini`. Override with `OPENAI_MODEL` (e.g. `gpt-4o`).

Without the API key, a mock grader runs (no generation; pass/fail based on whether input and expected output are non-empty).
