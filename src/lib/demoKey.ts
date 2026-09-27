import { NextResponse } from "next/server";

const HEADER = "x-demo-key";

/**
 * Gate for state-changing demo routes (T18a): reset, clock POST, rent-day, tenants,
 * topup, attacks. `/api/state` and `/api/chat` stay open.
 *
 * - DEMO_KEY set → require matching `x-demo-key` header (401 otherwise).
 * - DEMO_KEY unset locally → allow (so `next dev` / unit tests keep working).
 * - DEMO_KEY unset on Vercel/production → 503 (fail closed; set the env var).
 */
export function requireDemoKey(req: Request): NextResponse | null {
  const expected = process.env.DEMO_KEY;
  if (!expected) {
    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { success: false, error: "DEMO_KEY is not configured on this deploy" },
        { status: 503 },
      );
    }
    return null;
  }
  if (req.headers.get(HEADER) !== expected) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
