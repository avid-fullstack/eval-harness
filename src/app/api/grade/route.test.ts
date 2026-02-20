/**
 * Tests for the grade API. Mock path (no OPENAI_API_KEY): validates input/expected_output.
 * @jest-environment node
 */

import { POST } from "@/app/api/grade/route";

async function grade(body: { input?: string; expected_output?: string; rubric?: string }) {
  const req = new Request("http://localhost/api/grade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req);
}

describe("POST /api/grade", () => {
  const origEnv = process.env.OPENAI_API_KEY;

  beforeAll(() => {
    delete process.env.OPENAI_API_KEY;
  });

  afterAll(() => {
    if (origEnv !== undefined) process.env.OPENAI_API_KEY = origEnv;
  });

  it("returns pass when input and expected_output are non-empty", async () => {
    const res = await grade({
      input: "What is 2+2?",
      expected_output: "4",
      rubric: "Correct answer",
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.pass).toBe(true);
    expect(typeof data.reason).toBe("string");
  });

  it("returns fail when input is empty", async () => {
    const res = await grade({
      input: "",
      expected_output: "4",
      rubric: "Correct",
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.pass).toBe(false);
    expect(data.reason).toMatch(/input/i);
  });

  it("returns fail when expected_output is empty", async () => {
    const res = await grade({
      input: "What is 2+2?",
      expected_output: "",
      rubric: "Correct",
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.pass).toBe(false);
    expect(data.reason).toMatch(/expected|output/i);
  });

  it("returns 500 on invalid JSON body", async () => {
    const req = new Request("http://localhost/api/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
