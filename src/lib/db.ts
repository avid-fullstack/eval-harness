import { Pool } from "pg";

// Initializing PostgreSQL connection pool. Requires DATABASE_URL (e.g. postgresql://user:pass@host:5432/dbname).
const pool =
  process.env.DATABASE_URL &&
  process.env.DATABASE_URL.length > 0
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : null;

export interface DataState {
  datasets: { id: string; name: string; testCases: { id: string; input: string; expected_output: string }[] }[];
  graders: { id: string; name: string; description: string; rubric: string }[];
  results: { testCaseId: string; graderId: string; pass: boolean; reason: string }[];
}

// Creating tables if they do not exist. Avoid: changing schema without migration.
async function ensureSchema(): Promise<void> {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS datasets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS test_cases (
      id TEXT PRIMARY KEY,
      dataset_id TEXT NOT NULL,
      input TEXT NOT NULL,
      expected_output TEXT NOT NULL,
      FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS graders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      rubric TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS results (
      test_case_id TEXT NOT NULL,
      grader_id TEXT NOT NULL,
      pass SMALLINT NOT NULL,
      reason TEXT NOT NULL,
      PRIMARY KEY (test_case_id, grader_id),
      FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE CASCADE,
      FOREIGN KEY (grader_id) REFERENCES graders(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_test_cases_dataset ON test_cases(dataset_id);
    CREATE INDEX IF NOT EXISTS idx_results_test_case ON results(test_case_id);
    CREATE INDEX IF NOT EXISTS idx_results_grader ON results(grader_id);
  `);
}

// Loading all datasets, test cases, graders, and results from the database.
export async function loadData(): Promise<DataState> {
  if (!pool) {
    return { datasets: [], graders: [], results: [] };
  }
  await ensureSchema();

  const [datasetsRes, testCasesRes, gradersRes, resultsRes] = await Promise.all([
    pool.query<{ id: string; name: string }>("SELECT id, name FROM datasets ORDER BY name"),
    pool.query<{ id: string; dataset_id: string; input: string; expected_output: string }>(
      "SELECT id, dataset_id, input, expected_output FROM test_cases"
    ),
    pool.query<{ id: string; name: string; description: string; rubric: string }>(
      "SELECT id, name, description, rubric FROM graders ORDER BY name"
    ),
    pool.query<{ test_case_id: string; grader_id: string; pass: number; reason: string }>(
      "SELECT test_case_id, grader_id, pass, reason FROM results"
    ),
  ]);

  const datasets = datasetsRes.rows;
  const testCases = testCasesRes.rows;
  const graders = gradersRes.rows;
  const resultsRows = resultsRes.rows;

  // Grouping test cases by dataset ID for nested structure.
  const tcByDataset = new Map<string, { id: string; input: string; expected_output: string }[]>();
  for (const tc of testCases) {
    const list = tcByDataset.get(tc.dataset_id) ?? [];
    list.push({
      id: tc.id,
      input: tc.input,
      expected_output: tc.expected_output,
    });
    tcByDataset.set(tc.dataset_id, list);
  }

  return {
    datasets: datasets.map((d) => ({
      id: d.id,
      name: d.name,
      testCases: tcByDataset.get(d.id) ?? [],
    })),
    graders,
    results: resultsRows.map((r) => ({
      testCaseId: r.test_case_id,
      graderId: r.grader_id,
      pass: r.pass === 1,
      reason: r.reason,
    })),
  };
}

// Saving full state to the database. Replace-all strategy: delete then insert.
export async function saveData(data: DataState): Promise<void> {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM results");
    await client.query("DELETE FROM test_cases");
    await client.query("DELETE FROM datasets");
    await client.query("DELETE FROM graders");

    for (const d of data.datasets) {
      await client.query(
        "INSERT INTO datasets (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name",
        [d.id, d.name]
      );
      for (const tc of d.testCases) {
        await client.query(
          "INSERT INTO test_cases (id, dataset_id, input, expected_output) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET dataset_id = EXCLUDED.dataset_id, input = EXCLUDED.input, expected_output = EXCLUDED.expected_output",
          [tc.id, d.id, tc.input ?? "", tc.expected_output ?? ""]
        );
      }
    }
    for (const g of data.graders) {
      await client.query(
        "INSERT INTO graders (id, name, description, rubric) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, rubric = EXCLUDED.rubric",
        [g.id, g.name, g.description ?? "", g.rubric ?? ""]
      );
    }
    for (const r of data.results) {
      await client.query(
        "INSERT INTO results (test_case_id, grader_id, pass, reason) VALUES ($1, $2, $3, $4) ON CONFLICT (test_case_id, grader_id) DO UPDATE SET pass = EXCLUDED.pass, reason = EXCLUDED.reason",
        [r.testCaseId, r.graderId, r.pass ? 1 : 0, r.reason ?? ""]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
