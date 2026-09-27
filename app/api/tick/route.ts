import { NextResponse } from "next/server";
import { requireDemoKey } from "@/lib/demoKey";
import { queueRentReminders } from "@/agent/reminders";
import { clockOf, getDemoState } from "@/services/demoState";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const denied = requireDemoKey(req);

  if (denied) {
    return denied;
  }

  try {
    const clock = clockOf(await getDemoState());
    const reminders = await queueRentReminders();

    return NextResponse.json({
      success: true,
      clock,
      reminders,
    });
  } catch (error) {
    console.error(
      "Agent tick failed:",
      error instanceof Error ? error.name : "UnknownError"
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to run agent tick",
      },
      { status: 500 }
    );
  }
}
