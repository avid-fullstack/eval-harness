/**
 * Seed script: creates mock datasets (≥7) and graders (≥5).
 * Each dataset has ≥15 test cases with unique questions. expected_output mixes:
 * - Correct and concise (most graders pass)
 * - Correct but verbose/format that Strict or Format grader may fail
 * - Incorrect (all fail)
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

// 7 datasets, each 15+ unique questions. expected_output: correct concise, correct but verbose (Strict/Format may fail), or wrong.
const datasets = [
  {
    id: id("ds", 1),
    name: "Math facts",
    testCases: [
      { input: "What is 2 + 2?", expected_output: "4" },
      { input: "What is 3 × 4?", expected_output: "I believe the answer is 12." },
      { input: "What is 10 − 3?", expected_output: "6" },
      { input: "What is 15 ÷ 3?", expected_output: "5" },
      { input: "What is 7 × 8?", expected_output: "The result of 7 times 8 equals 56." },
      { input: "Is 17 prime?", expected_output: "Yes" },
      { input: "What is the square root of 64?", expected_output: "32" },
      { input: "What is 100 ÷ 4?", expected_output: "25" },
      { input: "What is 9 × 9?", expected_output: "81" },
      { input: "What is 2 to the power of 10?", expected_output: "1024" },
      { input: "Is 1 a prime number?", expected_output: "No" },
      { input: "What is 50% of 80?", expected_output: "40" },
      { input: "What is the sum of the angles in a triangle?", expected_output: "180 degrees" },
      { input: "What is 12 × 12?", expected_output: "One hundred forty-four." },
      { input: "What is 20 − 7?", expected_output: "13" },
      { input: "How many sides does a hexagon have?", expected_output: "5" },
    ],
  },
  {
    id: id("ds", 2),
    name: "Geography",
    testCases: [
      { input: "Capital of France?", expected_output: "Paris" },
      { input: "Capital of Japan?", expected_output: "The capital city of Japan is Tokyo." },
      { input: "Largest country by area?", expected_output: "Canada" },
      { input: "Capital of Australia?", expected_output: "Canberra" },
      { input: "Longest river in the world?", expected_output: "Nile" },
      { input: "Capital of Germany?", expected_output: "Berlin" },
      { input: "Capital of Brazil?", expected_output: "Rio de Janeiro" },
      { input: "Capital of Egypt?", expected_output: "Cairo" },
      { input: "Capital of India?", expected_output: "New Delhi" },
      { input: "Which continent has the most people?", expected_output: "Asia" },
      { input: "Capital of South Korea?", expected_output: "Seoul is the capital." },
      { input: "Largest ocean?", expected_output: "Pacific" },
      { input: "Capital of Italy?", expected_output: "Milan" },
      { input: "Capital of Spain?", expected_output: "Madrid" },
      { input: "Capital of Russia?", expected_output: "Moscow" },
      { input: "Capital of China?", expected_output: "Shanghai" },
    ],
  },
  {
    id: id("ds", 3),
    name: "Vocabulary",
    testCases: [
      { input: "Define 'ephemeral'.", expected_output: "Short-lived or lasting a very short time." },
      { input: "Antonym of 'benevolent'?", expected_output: "Malevolent" },
      { input: "Meaning of 'ambiguous'?", expected_output: "Very clear and obvious." },
      { input: "Synonym for 'enormous'?", expected_output: "Massive" },
      { input: "Define 'pragmatic'.", expected_output: "Practical and focused on what works." },
      { input: "Antonym of 'ancient'?", expected_output: "Modern" },
      { input: "Meaning of 'concise'?", expected_output: "Brief and to the point." },
      { input: "Define 'resilient'.", expected_output: "Able to recover quickly from difficulty." },
      { input: "Synonym for 'commence'?", expected_output: "Begin" },
      { input: "Meaning of 'obsolete'?", expected_output: "No longer in use or outdated." },
      { input: "Antonym of 'generous'?", expected_output: "Stingy" },
      { input: "Define 'meticulous'.", expected_output: "Showing great attention to detail." },
      { input: "Meaning of 'verbose'?", expected_output: "Using more words than needed." },
      { input: "Synonym for 'authentic'?", expected_output: "Genuine" },
      { input: "Define 'ambiguous'.", expected_output: "Unclear; having more than one possible meaning." },
      { input: "Antonym of 'transparent'?", expected_output: "Opaque" },
    ],
  },
  {
    id: id("ds", 4),
    name: "Logic",
    testCases: [
      { input: "If all A are B and all B are C, are all A C?", expected_output: "Yes" },
      { input: "Can a proposition be both true and false in classical logic?", expected_output: "No" },
      { input: "Is 'if P then Q' equivalent to 'if not Q then not P'?", expected_output: "Yes, contrapositive." },
      { input: "If no cats are dogs, are no dogs cats?", expected_output: "Yes" },
      { input: "True or false: (A and B) implies A.", expected_output: "True" },
      { input: "Is the converse of a true statement always true?", expected_output: "No" },
      { input: "If P or Q is true and P is false, what can we conclude?", expected_output: "Q is true." },
      { input: "Can an argument be valid with false premises?", expected_output: "Yes" },
      { input: "Is 'not (P and Q)' equivalent to '(not P) or (not Q)'?", expected_output: "Yes, De Morgan's law." },
      { input: "If X implies Y and Y is false, what about X?", expected_output: "X must be false." },
      { input: "Does 'some A are B' imply 'some B are A'?", expected_output: "Yes" },
      { input: "Is a tautology always true?", expected_output: "True" },
      { input: "If the premises are true and the argument is valid, is the conclusion true?", expected_output: "Yes." },
      { input: "Can a false statement imply a true one?", expected_output: "Yes, vacuously." },
      { input: "Is 'P only if Q' the same as 'if P then Q'?", expected_output: "Yes" },
      { input: "Does 'all A are B' imply 'all B are A'?", expected_output: "No" },
    ],
  },
  {
    id: id("ds", 5),
    name: "Science",
    testCases: [
      { input: "Chemical symbol for water?", expected_output: "H2O" },
      { input: "Does sound travel faster in water than in air?", expected_output: "Yes" },
      { input: "What is the chemical symbol for gold?", expected_output: "Go" },
      { input: "How many planets in our solar system?", expected_output: "8" },
      { input: "What is the speed of light in vacuum (approx)?", expected_output: "About 300,000 km/s" },
      { input: "Is the Earth flat?", expected_output: "No" },
      { input: "Primary gas in Earth's atmosphere?", expected_output: "Nitrogen" },
      { input: "What is DNA?", expected_output: "Molecule that carries genetic information." },
      { input: "Chemical symbol for table salt?", expected_output: "NaCl" },
      { input: "What is the powerhouse of the cell?", expected_output: "Mitochondrion" },
      { input: "Does light need a medium to travel?", expected_output: "No" },
      { input: "What is the boiling point of water in Celsius?", expected_output: "100" },
      { input: "How many bones in the adult human body?", expected_output: "Approximately 206 bones." },
      { input: "What is photosynthesis?", expected_output: "Process by which plants convert light into chemical energy." },
      { input: "Is the sun a star?", expected_output: "Yes" },
      { input: "What is the chemical symbol for iron?", expected_output: "Fe" },
    ],
  },
  {
    id: id("ds", 6),
    name: "History",
    testCases: [
      { input: "In what year did World War II end?", expected_output: "1944" },
      { input: "Who was the first president of the United States?", expected_output: "George Washington" },
      { input: "When did the French Revolution begin?", expected_output: "1789" },
      { input: "Who wrote the Declaration of Independence?", expected_output: "Thomas Jefferson" },
      { input: "In what year did the Berlin Wall fall?", expected_output: "1989" },
      { input: "Who was the leader of the Soviet Union during the Cuban Missile Crisis?", expected_output: "Nikita Khrushchev" },
      { input: "When did India gain independence?", expected_output: "1950" },
      { input: "Who invented the printing press?", expected_output: "Johannes Gutenberg" },
      { input: "In what year did Columbus reach the Americas?", expected_output: "1492" },
      { input: "Who was the British PM during most of WWII?", expected_output: "Winston Churchill" },
      { input: "When did the Roman Empire fall?", expected_output: "The Western Roman Empire fell in 476 CE." },
      { input: "Who discovered penicillin?", expected_output: "Alexander Fleming" },
      { input: "In what year did the Titanic sink?", expected_output: "1912" },
      { input: "Who was the first woman to win a Nobel Prize?", expected_output: "Marie Curie" },
      { input: "When did the American Civil War end?", expected_output: "1865" },
      { input: "Who built the Great Wall of China?", expected_output: "Qin Shi Huang" },
    ],
  },
  {
    id: id("ds", 7),
    name: "General knowledge",
    testCases: [
      { input: "How many days in a leap year?", expected_output: "366" },
      { input: "What is the largest mammal?", expected_output: "Blue whale" },
      { input: "How many continents are there?", expected_output: "6" },
      { input: "What color is the sky on a clear day?", expected_output: "Blue" },
      { input: "How many strings does a standard guitar have?", expected_output: "6" },
      { input: "What is the boiling point of water in Celsius?", expected_output: "100" },
      { input: "Who painted the Mona Lisa?", expected_output: "Leonardo da Vinci" },
      { input: "What is the smallest prime number?", expected_output: "1" },
      { input: "How many hours in a day?", expected_output: "24" },
      { input: "What is the largest planet in our solar system?", expected_output: "Jupiter" },
      { input: "How many legs does a spider have?", expected_output: "Eight legs." },
      { input: "What is the freezing point of water in Celsius?", expected_output: "0" },
      { input: "Who wrote Romeo and Juliet?", expected_output: "William Shakespeare" },
      { input: "How many weeks in a year?", expected_output: "52" },
      { input: "What is the capital of the United States?", expected_output: "Washington, D.C." },
      { input: "How many minutes in an hour?", expected_output: "60" },
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
