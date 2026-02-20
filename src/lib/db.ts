import { Pool } from "pg";

// Initializing PostgreSQL connection pool. Requires DATABASE_URL (e.g. postgresql://user:pass@host:5432/dbname).
const pool =
  process.env.DATABASE_URL &&
  process.env.DATABASE_URL.length > 0
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : null;

export function isDatabaseConfigured(): boolean {
  return pool != null;
}

export interface DataState {
  datasets: { id: string; name: string; testCases: { id: string; input: string; expected_output: string }[] }[];
  graders: { id: string; name: string; description: string; rubric: string }[];
  results: { testCaseId: string; graderId: string; pass: boolean; reason: string; generated_output?: string }[];
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
      generated_output TEXT,
      PRIMARY KEY (test_case_id, grader_id),
      FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE CASCADE,
      FOREIGN KEY (grader_id) REFERENCES graders(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_test_cases_dataset ON test_cases(dataset_id);
    CREATE INDEX IF NOT EXISTS idx_results_test_case ON results(test_case_id);
    CREATE INDEX IF NOT EXISTS idx_results_grader ON results(grader_id);
  `);
  await pool.query(`
    ALTER TABLE results ADD COLUMN IF NOT EXISTS generated_output TEXT;
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
    pool.query<{ test_case_id: string; grader_id: string; pass: number; reason: string; generated_output: string | null }>(
      "SELECT test_case_id, grader_id, pass, reason, generated_output FROM results"
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
      ...(r.generated_output != null && r.generated_output !== "" && { generated_output: r.generated_output }),
    })),
  };
}

// Saving state incrementally: upsert then delete only what is no longer in payload. Keeps unmodified data.
export async function saveData(data: DataState): Promise<void> {
  if (!pool) return;
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const datasetIds = data.datasets.map((d) => d.id);
    const tcIds = data.datasets.flatMap((d) => d.testCases.map((tc) => tc.id));
    const graderIds = data.graders.map((g) => g.id);
    const resultPairs = data.results.map((r) => [r.testCaseId, r.graderId] as const);

    for (const d of data.datasets) {
      await client.query(
        "INSERT INTO datasets (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name",
        [d.id, d.name]
      );
    }
    if (datasetIds.length > 0) {
      await client.query("DELETE FROM datasets WHERE id NOT IN (SELECT unnest($1::text[]))", [datasetIds]);
    } else {
      await client.query("DELETE FROM datasets");
    }

    for (const d of data.datasets) {
      for (const tc of d.testCases) {
        await client.query(
          "INSERT INTO test_cases (id, dataset_id, input, expected_output) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET dataset_id = EXCLUDED.dataset_id, input = EXCLUDED.input, expected_output = EXCLUDED.expected_output",
          [tc.id, d.id, tc.input ?? "", tc.expected_output ?? ""]
        );
      }
    }
    if (tcIds.length > 0) {
      await client.query("DELETE FROM test_cases WHERE id NOT IN (SELECT unnest($1::text[]))", [tcIds]);
    } else {
      await client.query("DELETE FROM test_cases");
    }

    for (const g of data.graders) {
      await client.query(
        "INSERT INTO graders (id, name, description, rubric) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, rubric = EXCLUDED.rubric",
        [g.id, g.name, g.description ?? "", g.rubric ?? ""]
      );
    }
    if (graderIds.length > 0) {
      await client.query("DELETE FROM graders WHERE id NOT IN (SELECT unnest($1::text[]))", [graderIds]);
    } else {
      await client.query("DELETE FROM graders");
    }

    for (const r of data.results) {
      await client.query(
        "INSERT INTO results (test_case_id, grader_id, pass, reason, generated_output) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (test_case_id, grader_id) DO UPDATE SET pass = EXCLUDED.pass, reason = EXCLUDED.reason, generated_output = EXCLUDED.generated_output",
        [r.testCaseId, r.graderId, r.pass ? 1 : 0, r.reason ?? "", r.generated_output ?? null]
      );
    }
    if (resultPairs.length > 0) {
      const tcIdsForResults = resultPairs.map(([tc]) => tc);
      const gIdsForResults = resultPairs.map(([, g]) => g);
      await client.query(
        "DELETE FROM results WHERE (test_case_id, grader_id) NOT IN (SELECT unnest($1::text[]) AS tc, unnest($2::text[]) AS g)",
        [tcIdsForResults, gIdsForResults]
      );
    } else {
      await client.query("DELETE FROM results");
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
