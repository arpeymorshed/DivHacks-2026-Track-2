import { NextResponse } from "next/server";
import { seedDemoData } from "@/lib/seedDemoData";

export const runtime = "nodejs";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Seed route disabled in production" },
      { status: 403 }
    );
  }

  try {
    const result = await seedDemoData();
    return NextResponse.json({ success: true, seeded: result });
  } catch (error) {
    // Do not put connection details or tenant phone numbers in logs.
    console.error("Seed failed:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json(
      { success: false, error: "Failed to seed demo data" },
      { status: 500 }
    );
  }
}
