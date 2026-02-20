import { NextResponse } from "next/server";
import { loadData, saveData } from "@/lib/db";

// Loading all data from PostgreSQL.
export async function GET() {
  try {
    const data = await loadData();
    return NextResponse.json(data);
  } catch (e) {
    console.error("Load data error:", e);
    return NextResponse.json(
      { error: "Failed to load data" },
      { status: 500 }
    );
  }
}

// Saving full state to PostgreSQL.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = {
      datasets: body.datasets ?? [],
      graders: body.graders ?? [],
      results: body.results ?? [],
    };
    await saveData(data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Save data error:", e);
    return NextResponse.json(
      { error: "Failed to save data" },
      { status: 500 }
    );
  }
}
