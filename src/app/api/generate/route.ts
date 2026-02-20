import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { NextResponse } from "next/server";

interface GenerateRequest {
  input: string;
}

// Generating model output for the input.
export async function POST(req: Request) {
  try {
    // Rejecting when API key is missing.
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 503 }
      );
    }
    const body: GenerateRequest = await req.json();
    const { input } = body;
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: input ?? "",
    });
    return NextResponse.json({ output: text });
  } catch (e) {
    console.error("Generate API error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generation failed" },
      { status: 500 }
    );
  }
}
