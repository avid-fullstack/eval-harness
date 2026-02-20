import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { NextResponse } from "next/server";

interface GradeRequest {
  input: string;
  expected_output: string;
  rubric: string;
  graderName?: string;
  /** Model output to grade. */
  actual_output?: string;
}

// Checking whether AI grading is available.
function useAiGrading(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

// Evaluating output against the rubric. AI when key set; mock otherwise.
export async function POST(req: Request) {
  try {
    const body: GradeRequest = await req.json();
    const { input, expected_output, rubric, graderName, actual_output } = body;

    const hasInput = (input ?? "").trim().length > 0;
    const hasExpected = (expected_output ?? "").trim().length > 0;

    // Falling back to mock grader when OPENAI_API_KEY is unset.
    if (!useAiGrading()) {
      const pass = hasInput && hasExpected;
      const reason = pass
        ? "Mock: input and expected output provided."
        : !hasInput
          ? "Missing or empty input."
          : "Missing or empty expected output.";
      return NextResponse.json({ pass, reason });
    }

    // Running AI-based grading with the rubric.
    const outputToGrade = actual_output ?? expected_output;
    const isComparing = actual_output !== undefined;

    const systemPrompt = `You are an evaluation assistant. Grade the response against the rubric. Reply only with valid JSON in this exact format:
{"pass": true|false, "reason": "brief explanation"}

Rules for "reason":
- When failing: state the core issue in one short, factual sentence (e.g. what is wrong or what the correct answer is). Do not preface with "The expected output is incorrect" or rubric-specific wording—just the issue itself.
- When passing: one short sentence (e.g. "Correct." or "Matches expected.").
- Keep the reason consistent and reusable across different rubrics.

Rubric:
${rubric || "Evaluate correctness and completeness."}`;

    const userPrompt = isComparing
      ? `Input: ${input ?? "(none)"}

Expected output: ${expected_output ?? "(none)"}

Actual output to grade: ${outputToGrade ?? "(none)"}

Does the actual output satisfy the expected output according to the rubric? Reply with JSON only.`
      : `Input: ${input ?? "(none)"}

Expected output: ${expected_output ?? "(none)"}

Is this expected output a valid, correct answer for the input? Reply with JSON only.`;

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      prompt: userPrompt,
    });

    // Parsing the JSON response. Handling markdown code blocks from the model.
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    if (parsed && typeof parsed.pass === "boolean" && typeof parsed.reason === "string") {
      return NextResponse.json({
        pass: parsed.pass,
        reason: parsed.reason.trim(),
      });
    }

    // Falling back when the model returns invalid JSON.
    const pass = hasInput && hasExpected;
    return NextResponse.json({
      pass,
      reason: parsed?.reason ?? `AI response unclear. Raw: ${text.slice(0, 200)}`,
    });
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
