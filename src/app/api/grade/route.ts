import { NextResponse } from "next/server";
import OpenAI from "openai";

const DEFAULT_MODEL = "gpt-4o-mini";

interface GradeRequest {
  input: string;
  expected_output: string;
  rubric: string;
  graderName?: string;
  /** If omitted and AI available: generate from input (this becomes the correct answer for grading). */
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

// POST /api/grade — Generate correct answer (actual_output) from input, then evaluate whether user's expected_output passes or fails against that correct answer and the rubric.
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
      `You are an evaluation assistant. Your job is to evaluate whether the EXPECTED OUTPUT (user-provided) passes or fails.

The CORRECT ANSWER is the actual_output (the generated answer). The user gave an expected_output. You must decide: does the expected_output pass or fail when judged against the correct answer and the rubric?

Reply only with valid JSON in this exact form (no other text):
{"pass": true|false, "reason": "one short sentence here"}

Rules:
- pass: true when the expected_output (user's answer) is acceptable: it matches or satisfies the correct answer (actual_output) according to the rubric. If they are the same or semantically equivalent, pass. Do not fail when they match.
- fail: when the expected_output is wrong (does not match the correct answer) or does not meet the rubric (e.g. format, completeness). Do not fail for verbosity when the expected_output is already short (one word, one number, one short sentence).
- reason: one short sentence. No double-quotes or backslashes inside the reason (use only letters, numbers, periods, commas).
  - If pass: "Matches correct answer."
  - If fail (wrong answer): "The correct answer is [actual_output], but the expected_output was given [expected_output]."
  - If fail (rubric only): "The expected_output is failed because [brief reason]."

Rubric:
${rubric || "Evaluate correctness and completeness."}`;

    const userPrompt =
      `Input (question): ${input ?? "(none)"}

Correct answer (generated): ${outputToGrade ?? "(none)"}

Expected output (user-provided, to evaluate): ${expected_output ?? "(none)"}

Does the expected_output pass or fail when judged against the correct answer and the rubric? Reply with JSON only.`;

    const text = await openaiChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let parsed: { pass?: boolean; reason?: string } | null = null;
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]) as { pass?: boolean; reason?: string };
      } catch {
        // JSON parse can fail on escaped characters in the reason string; try to extract pass and reason manually
        const passMatch = jsonMatch[0].match(/"pass"\s*:\s*(true|false)/i);
        const reasonMatch = jsonMatch[0].match(/"reason"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (passMatch && reasonMatch) {
          parsed = {
            pass: passMatch[1].toLowerCase() === "true",
            reason: reasonMatch[1].replace(/\\"/g, '"').trim(),
          };
        }
      }
    }

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
