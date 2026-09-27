import { NextResponse } from "next/server";
import { resetDemoOutbox } from "@/services/outboxService";

export async function POST() {
  try {
    const result = await resetDemoOutbox();

    return NextResponse.json({
      success: true,
      reset: result,
    });
  } catch (error) {
    console.error("Demo reset failed:", error instanceof Error ? error.name : "UnknownError");

    return NextResponse.json(
      {
        success: false,
        error: "Demo reset failed",
      },
      { status: 500 }
    );
  }
}
