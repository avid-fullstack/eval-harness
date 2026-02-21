/**
 * Seed script: creates mock datasets (≥7) and graders (≥5).
 * Each dataset has 7–8 test cases. expected_output mixes:
 * - Wrong answer (all graders fail)
 * - Correct but verbose/format (Strict or Format grader may fail)
 * - Correct and concise (most graders pass)
 *
 * Usage: node seed.js
 * Requires: DATABASE_URL in .env.local or environment.
 */

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS datasets (id TEXT PRIMARY KEY, name TEXT NOT NULL);
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
  await pool.query(`ALTER TABLE results ADD COLUMN IF NOT EXISTS generated_output TEXT;`);
}

function id(prefix, n) {
  return `${prefix}_${n}`;
}

// 7 datasets, each 7–8 test cases: wrong answer, correct-but-verbose (Strict/Format may fail), correct-and-concise (pass).
const datasets = [
  {
    id: id("ds", 1),
    name: "Math facts",
    testCases: [
      { input: "What is 2 + 2?", expected_output: "4" },
      { input: "What is 3 × 4?", expected_output: "I believe the answer is 12." },
      { input: "What is 10 − 3?", expected_output: "6" },
      { input: "What is the square root of 64?", expected_output: "32" },
      { input: "What is 12 × 12?", expected_output: "One hundred forty-four." },
      { input: "What is 15 ÷ 3?", expected_output: "5" },
      { input: "How many sides does a hexagon have?", expected_output: "5" },
      { input: "What is 7 × 8?", expected_output: "The result of 7 times 8 equals 56." },
    ],
  },
  {
    id: id("ds", 2),
    name: "Geography",
    testCases: [
      { input: "Capital of France?", expected_output: "Paris" },
      { input: "Capital of Japan?", expected_output: "The capital city of Japan is Tokyo." },
      { input: "Largest country by area?", expected_output: "Canada" },
      { input: "Capital of Brazil?", expected_output: "Rio de Janeiro" },
      { input: "Capital of Australia?", expected_output: "Canberra" },
      { input: "Capital of South Korea?", expected_output: "Seoul is the capital." },
      { input: "Capital of Italy?", expected_output: "Milan" },
      { input: "Capital of China?", expected_output: "Shanghai" },
    ],
  },
  {
    id: id("ds", 3),
    name: "Vocabulary",
    testCases: [
      { input: "Antonym of 'benevolent'?", expected_output: "Malevolent" },
      { input: "Meaning of 'ambiguous'?", expected_output: "Very clear and obvious." },
      { input: "Synonym for 'enormous'?", expected_output: "Massive" },
      { input: "Meaning of 'concise'?", expected_output: "Brief and to the point." },
      { input: "Define 'ephemeral'.", expected_output: "Short-lived or lasting a very short time." },
      { input: "Define 'ambiguous'.", expected_output: "Unclear; having more than one possible meaning." },
      { input: "Meaning of 'verbose'?", expected_output: "Using more words than needed." },
      { input: "Synonym for 'authentic'?", expected_output: "Genuine" },
    ],
  },
  {
    id: id("ds", 4),
    name: "Logic",
    testCases: [
      { input: "If all A are B and all B are C, are all A C?", expected_output: "Yes" },
      { input: "Can a proposition be both true and false in classical logic?", expected_output: "No" },
      { input: "Is 'if P then Q' equivalent to 'if not Q then not P'?", expected_output: "Yes, contrapositive." },
      { input: "Does 'all A are B' imply 'all B are A'?", expected_output: "No" },
      { input: "True or false: (A and B) implies A.", expected_output: "True" },
      { input: "If P or Q is true and P is false, what can we conclude?", expected_output: "Q is true." },
      { input: "Is the converse of a true statement always true?", expected_output: "No" },
      { input: "If X implies Y and Y is false, what about X?", expected_output: "X must be false." },
    ],
  },
  {
    id: id("ds", 5),
    name: "Science",
    testCases: [
      { input: "Chemical symbol for water?", expected_output: "H2O" },
      { input: "What is the chemical symbol for gold?", expected_output: "Go" },
      { input: "How many planets in our solar system?", expected_output: "8" },
      { input: "Primary gas in Earth's atmosphere?", expected_output: "Nitrogen" },
      { input: "How many bones in the adult human body?", expected_output: "Approximately 206 bones." },
      { input: "Chemical symbol for table salt?", expected_output: "NaCl" },
      { input: "What is the boiling point of water in Celsius?", expected_output: "100" },
      { input: "What is the chemical symbol for iron?", expected_output: "Fe" },
    ],
  },
  {
    id: id("ds", 6),
    name: "History",
    testCases: [
      { input: "In what year did World War II end?", expected_output: "1944" },
      { input: "Who was the first president of the United States?", expected_output: "George Washington" },
      { input: "When did India gain independence?", expected_output: "1950" },
      { input: "When did the French Revolution begin?", expected_output: "1789" },
      { input: "When did the Roman Empire fall?", expected_output: "The Western Roman Empire fell in 476 CE." },
      { input: "Who invented the printing press?", expected_output: "Johannes Gutenberg" },
      { input: "In what year did the Titanic sink?", expected_output: "1912" },
      { input: "Who built the Great Wall of China?", expected_output: "Qin Shi Huang" },
    ],
  },
  {
    id: id("ds", 7),
    name: "General knowledge",
    testCases: [
      { input: "How many days in a leap year?", expected_output: "366" },
      { input: "What is the smallest prime number?", expected_output: "1" },
      { input: "How many continents are there?", expected_output: "6" },
      { input: "What color is the sky on a clear day?", expected_output: "Blue" },
      { input: "How many legs does a spider have?", expected_output: "Eight legs." },
      { input: "How many hours in a day?", expected_output: "24" },
      { input: "Who wrote Romeo and Juliet?", expected_output: "William Shakespeare" },
      { input: "What is the capital of the United States?", expected_output: "Washington, D.C." },
    ],
  },
];

const graders = [
  {
    id: id("gr", 1),
    name: "Correctness",
    description: "Pass if the answer is correct and matches expected.",
    rubric: "Pass when the response is factually correct and matches the expected output. Fail on errors or irrelevant answers.",
  },
  {
    id: id("gr", 2),
    name: "Strict",
    description: "Strict grading: require precise wording.",
    rubric: "Pass only when the response is correct and precise. Fail on ambiguity, extra irrelevant content, or minor inaccuracies.",
  },
  {
    id: id("gr", 3),
    name: "Lenient",
    description: "Lenient: accept equivalent or partial answers.",
    rubric: "Pass when the response is correct or substantially equivalent to the expected output. Fail only on clearly wrong answers.",
  },
  {
    id: id("gr", 4),
    name: "Format",
    description: "Check that the answer format is appropriate.",
    rubric: "Pass when the response is in the expected format (e.g. number, short phrase, yes/no) and correct. Fail on wrong format or wrong content.",
  },
  {
    id: id("gr", 5),
    name: "Completeness",
    description: "Require complete and unambiguous answers.",
    rubric: "Pass when the response fully answers the question and is correct. Fail on incomplete, vague, or incorrect answers.",
  },
];

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Add it to .env.local or the environment.");
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await ensureSchema();

    for (const d of datasets) {
      await client.query(
        "INSERT INTO datasets (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name",
        [d.id, d.name]
      );
      for (let i = 0; i < d.testCases.length; i++) {
        const tc = d.testCases[i];
        await client.query(
          "INSERT INTO test_cases (id, dataset_id, input, expected_output) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET dataset_id = EXCLUDED.dataset_id, input = EXCLUDED.input, expected_output = EXCLUDED.expected_output",
          [id("tc", `${d.id}_${i}`), d.id, tc.input, tc.expected_output]
        );
      }
    }

    for (const g of graders) {
      await client.query(
        "INSERT INTO graders (id, name, description, rubric) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, rubric = EXCLUDED.rubric",
        [g.id, g.name, g.description, g.rubric]
      );
    }

    const totalCases = datasets.reduce((sum, d) => sum + d.testCases.length, 0);
    console.log("Seed done: %d datasets, %d graders, %d test cases.", datasets.length, graders.length, totalCases);
  } catch (e) {
    console.error("Seed failed:", e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
