/** Single test case: input plus expected answer. */
export interface TestCase {
  id: string;
  input: string;
  expected_output: string;
}

/** Grader definition: name, description, rubric. */
export interface Grader {
  id: string;
  name: string;
  description: string;
  rubric: string;
}

/** Result returned by the grade API. */
export interface GradeResult {
  pass: boolean;
  reason: string;
  /** Model-generated output when grade API also generates (generate+grade flow). */
  generated_output?: string;
}

/** Stored result for one test case graded by one grader. */
export interface ExperimentResult {
  testCaseId: string;
  graderId: string;
  pass: boolean;
  reason: string;
  /** Grader-generated output when using generate-then-grade flow. */
  generated_output?: string;
}

/** Dataset: named collection of test cases. */
export interface Dataset {
  id: string;
  name: string;
  testCases: TestCase[];
}
