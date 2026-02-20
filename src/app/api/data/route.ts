import { NextResponse } from "next/server";
import { isDatabaseConfigured, loadData, saveData } from "@/lib/db";

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

// Saving full state to PostgreSQL. Returns 503 when DATABASE_URL is not set.
export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured. Set DATABASE_URL in .env.local to persist data." },
      { status: 503 }
    );
  }
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
