# Eval Harness

A lightweight eval harness for running graders against test cases. Built with Next.js.

## User Flow

1. **Create a dataset** – Add test cases with `input` and `expected_output` in the Dataset tab.
2. **Define graders** – Create evaluation criteria (name, description, rubric) in the Graders tab.
3. **Run an experiment** – Select a dataset and graders, then click Run in the Experiment tab.
4. **Review results** – View pass/fail per grader per test case; hover cells to see reasons.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### PostgreSQL

Set `DATABASE_URL` in `.env.local` (e.g. `postgresql://user:password@localhost:5432/eval_harness`). Tables are created automatically on first load. Without `DATABASE_URL`, the app runs with in-memory state only (no persistence).

### Tests

```bash
npm test
```

Tests cover the grade API (mock path), data API (with mocked db), and the Tabs component. No real database or API keys are required.

## Features

- **Dataset tab**: CRUD for test case rows (input, expected_output)
- **Graders tab**: CRUD for grader definitions
- **Experiment tab**: Run selected graders against a dataset
- **Results table**: Pass/fail per cell; failed cells show reason
- **SQL persistence**: Data stored in PostgreSQL (set `DATABASE_URL` in `.env.local`)
- **Aggregate stats**: Pass rate per grader
- **Export**: Excel (.xlsx) with Overview sheet + Results sheet

## AI-based grading

Set `OPENAI_API_KEY` in `.env.local` to enable AI grading. The `/api/grade` route uses GPT-4o-mini to evaluate responses against the rubric.

- **Without model**: Evaluates whether the expected output is valid for the input (test case validation).
- **With model**: Enable "Use model to generate answers" in the Experiment tab. The system generates model output for each test case, then grades it against the expected output. Use this to run a full eval loop: generate answers with an LLM, then grade them.
