import { NextResponse } from "next/server";
import { isDatabaseConfigured, loadData, saveData } from "@/lib/db";

// GET /api/data — Load full state (datasets, graders, results) from the database.
export async function GET() {
  try {
    const data = await loadData();
    return NextResponse.json(data);
  } catch (e) {
    // Catch loadData() failures (e.g. connection error, query error) and return 500 so the client can handle.
    console.error("Load data error:", e);
    return NextResponse.json(
      { error: "Failed to load data" },
      { status: 500 }
    );
  }
}

// POST /api/data — Save full state to the database. Returns 503 when DATABASE_URL is not set.
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
    // Catch req.json() or saveData() failures (e.g. invalid JSON, DB error) and return 500.
    console.error("Save data error:", e);
    return NextResponse.json(
      { error: "Failed to save data" },
      { status: 500 }
    );
  }
}
