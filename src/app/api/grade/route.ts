import { NextResponse } from "next/server";
import OpenAI from "openai";

const DEFAULT_MODEL = "gpt-4o-mini";

interface GradeRequest {
  input: string;
  expected_output: string;
  rubric: string;
  graderName?: string;
  /** If omitted and AI available: generate from input, then grade expected vs generated. */
  actual_output?: string;
}

function useAiGrading(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
}

async function openaiChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
): Promise<string> {
  const client = getOpenAIClient();
  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

  const completion = await client.chat.completions.create({
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const content = completion.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : "";
}

// POST /api/grade — Generate-then-grade: generate answer from input, then grade expected vs generated. When actual_output is provided, only grade.
export async function POST(req: Request) {
  try {
    const body: GradeRequest = await req.json();
    const { input, expected_output, rubric, graderName, actual_output: providedOutput } = body;

    const hasInput = (input ?? "").trim().length > 0;
    const hasExpected = (expected_output ?? "").trim().length > 0;

    if (!useAiGrading()) {
      const pass = hasInput && hasExpected;
      const reason = pass
        ? "Mock: input and expected output provided."
        : !hasInput
          ? "Missing or empty input."
          : "Missing or empty expected output.";
      return NextResponse.json({ pass, reason });
    }

    let actual_output: string | undefined = providedOutput;

    if (actual_output === undefined) {
      const text = await openaiChat([
        { role: "user", content: (input ?? "").trim() || "(no input)" },
      ]);
      actual_output = text?.trim() ?? "";
    }

    const outputToGrade = actual_output;

    const systemPrompt =
      `You are an evaluation assistant. Compare the actual output to the expected output. Reply only with valid JSON in this exact format:
{"pass": true|false, "reason": "..."}

Rules:
- pass: true only when the actual output matches or satisfies the expected output according to the rubric.
- reason: use this style so all evaluations are consistent:
  - If pass: use exactly "Matches expected."
  - If fail because the actual answer does not match expected (wrong answer): "The correct answer is [actual output], but the expected_output was given [expected output]."
  - If fail because the answer matches expected but does not satisfy the rubric (e.g. format, strictness): "The expected_output is failed because [brief reason from rubric]."

Rubric:
${rubric || "Evaluate correctness and completeness."}`;

    const userPrompt =
      `Input: ${input ?? "(none)"}

Expected output: ${expected_output ?? "(none)"}

Actual output to grade: ${outputToGrade ?? "(none)"}

Does the actual output match or satisfy the expected output according to the rubric? Reply with JSON only.`;

    const text = await openaiChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    if (parsed && typeof parsed.pass === "boolean" && typeof parsed.reason === "string") {
      const res: { pass: boolean; reason: string; generated_output?: string } = {
        pass: parsed.pass,
        reason: parsed.reason.trim(),
      };
      if (actual_output !== undefined && providedOutput === undefined) res.generated_output = actual_output;
      return NextResponse.json(res);
    }

    const pass = hasInput && hasExpected;
    const fallback: { pass: boolean; reason: string; generated_output?: string } = {
      pass,
      reason: parsed?.reason ?? `AI response unclear. Raw: ${(text ?? "").slice(0, 200)}`,
    };
    if (actual_output !== undefined && providedOutput === undefined) fallback.generated_output = actual_output;
    return NextResponse.json(fallback);
  } catch (e) {
    console.error("Grade API error:", e);
    return NextResponse.json(
      {
        pass: false,
        reason: e instanceof Error ? e.message : "Error during grading.",
      },
      { status: 500 }
    );
  }
}
