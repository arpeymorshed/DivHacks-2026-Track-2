import { NextResponse } from "next/server";
import { runRentDay } from "@/agent/mainAgent";

export async function POST() {
  try {
    const results = await runRentDay();

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Rent day failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to run rent day",
      },
      { status: 500 }
    );
  }
}
