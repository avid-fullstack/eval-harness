import { NextResponse } from "next/server";
import OpenAI from "openai";

const DEFAULT_MODEL = "gpt-4o-mini";

interface GradeRequest {
  input: string;
  expected_output: string;
  rubric: string;
  graderName?: string;
  /** If provided, used as correct answer and we only evaluate (one call). Otherwise we generate + evaluate in one call. */
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
    temperature: 0, // Deterministic: same input → same correct_answer and evaluation across runs.
  });

  const content = completion.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : "";
}

// POST /api/grade — One call: generate correct answer (or use provided) and evaluate expected_output in a single request.
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

    // One combined prompt: generate correct answer (or use provided) and evaluate expected_output. Evaluation depends strictly on the selected grader's rubric — no extra rules.
    const systemPrompt =
      `You are an evaluation assistant. You will receive an input (question), an expected_output (the response to evaluate), and a rubric. The rubric is the set of rules for the grader that was selected. Your evaluation must depend strongly and only on these rules.

Your tasks in one go:
1. Determine the correct answer to the input (if not already provided). When the rubric specifies a required format or style (e.g. number in words, full sentence, short phrase), generate the correct_answer in that form. If the rubric does not mention format, use a concise, canonical phrasing (e.g. for yes/no questions use "Yes" or "No") so that repeated evaluations are consistent.
2. Evaluate whether the expected_output passes or fails according to the rubric. Pass only when the expected_output satisfies every rule stated in the rubric. Fail when any rule in the rubric is not satisfied. Do not add or relax criteria that are not in the rubric.

Reply only with valid JSON in this exact form (no other text):
{"correct_answer": "the correct answer (in the form required by the rubric if it specifies one)", "pass": true|false, "reason": "one short sentence"}

Rules:
- When comparing expected_output to the correct answer for correctness: treat them as equivalent if they differ only by letter case (e.g. "No" and "no", "Yes" and "yes"). Do not fail for case differences alone; pass when the content matches ignoring case.
- pass: true only when the expected_output satisfies all criteria in the rubric. If the rubric says to check format, then format is required; if the rubric does not mention format, do not fail for format.
- fail: when any criterion in the rubric is not met. The rubric defines what matters for this grader.
- reason: one short sentence. No double-quotes or backslashes inside the reason (use only letters, numbers, periods, commas). Reference which rubric rule was not satisfied when failing.

Rubric (rules of the selected grader — apply these strictly; do not add or ignore any):
${rubric || "Evaluate correctness and completeness."}`;

    const userPrompt = providedOutput
      ? `Input (question): ${input ?? "(none)"}

Correct answer (provided, use as-is): ${providedOutput}

Expected output (response to evaluate): ${expected_output ?? "(none)"}

Apply the rubric rules strictly. Evaluate: does the expected_output pass or fail according to every rule in the rubric? Reply with JSON: {"correct_answer": "${providedOutput.replace(/"/g, '\\"')}", "pass": true|false, "reason": "..."}`
      : `Input (question): ${input ?? "(none)"}

Expected output (response to evaluate): ${expected_output ?? "(none)"}

First determine the correct answer to the input (if the rubric specifies a format or style, use that for correct_answer). Then evaluate whether the expected_output passes or fails according to every rule in the rubric. Evaluation depends strongly on the selected grader rules only. Reply with JSON only: {"correct_answer": "...", "pass": true|false, "reason": "..."}`;

    const text = await openaiChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let parsed: { correct_answer?: string; pass?: boolean; reason?: string } | null = null;
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]) as {
          correct_answer?: string;
          pass?: boolean;
          reason?: string;
        };
      } catch {
        const passMatch = jsonMatch[0].match(/"pass"\s*:\s*(true|false)/i);
        const reasonMatch = jsonMatch[0].match(/"reason"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        const correctMatch = jsonMatch[0].match(/"correct_answer"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (passMatch && reasonMatch) {
          parsed = {
            pass: passMatch[1].toLowerCase() === "true",
            reason: reasonMatch[1].replace(/\\"/g, '"').trim(),
          };
          if (correctMatch)
            parsed.correct_answer = correctMatch[1].replace(/\\"/g, '"').trim();
        }
      }
    }

    const generatedOutput =
      typeof parsed?.correct_answer === "string"
        ? parsed.correct_answer.trim()
        : providedOutput;

    if (parsed && typeof parsed.pass === "boolean" && typeof parsed.reason === "string") {
      const res: { pass: boolean; reason: string; generated_output?: string } = {
        pass: parsed.pass,
        reason: parsed.reason.trim(),
      };
      if (generatedOutput !== undefined && generatedOutput !== "" && providedOutput === undefined)
        res.generated_output = generatedOutput;
      return NextResponse.json(res);
    }

    const pass = hasInput && hasExpected;
    const fallback: { pass: boolean; reason: string; generated_output?: string } = {
      pass,
      reason: parsed?.reason ?? `AI response unclear. Raw: ${(text ?? "").slice(0, 200)}`,
    };
    if (generatedOutput && providedOutput === undefined) fallback.generated_output = generatedOutput;
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
