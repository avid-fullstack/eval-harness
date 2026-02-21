import { NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b:free";

interface GradeRequest {
  input: string;
  expected_output: string;
  rubric: string;
  graderName?: string;
  /** If omitted and AI available: generate from input, then grade expected vs generated. */
  actual_output?: string;
}

// OpenRouter request/response types
interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
  reasoning_details?: unknown;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
      reasoning_details?: unknown;
    };
  }>;
}

function useAiGrading(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

async function openrouterChat(messages: OpenRouterMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message ?? `OpenRouter ${res.status}`);
  }

  const data: OpenRouterResponse = await res.json();
  const content = data.choices?.[0]?.message?.content;
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
      const text = await openrouterChat([
        { role: "user", content: (input ?? "").trim() || "(no input)" },
      ]);
      actual_output = text?.trim() ?? "";
    }

    const outputToGrade = actual_output;

    const systemPrompt =
      `You are an evaluation assistant. Grade the response against the rubric. Reply only with valid JSON in this exact format:
    {"pass": true|false, "reason": "brief explanation"}
    
    Rules for "reason":
    - When failing: state the core issue in one short, factual sentence (e.g. what is wrong or what the correct answer is). Do not preface with "The expected output is incorrect" or rubric-specific wording—just the issue itself.
    - When passing: one short sentence (e.g. "Correct." or "Matches expected.").
    - Keep the reason consistent and reusable across different rubrics.
    
    Rubric:
    ${rubric || "Evaluate correctness and completeness."}`;

    const userPrompt =
      `Input: ${input ?? "(none)"}
    
    Expected output: ${expected_output ?? "(none)"}
    
    Actual output to grade: ${outputToGrade ?? "(none)"}
    
    Does the actual output satisfy the expected output according to the rubric? Reply with JSON only.`;

    const text = await openrouterChat([
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
