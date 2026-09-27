import { NextResponse } from "next/server";
import { Wallet } from "xrpl";
import { getTenantById } from "@/services/rentRepository";
import { envSeed } from "@/services/xrplConfig";

export const runtime = "nodejs";
export const maxDuration = 30;

// T33: the tenant's "Top up" button. The simulated bank sends RLUSD to the tenant's own rent wallet.
// Only the amount comes from the request; the wallet comes from the DB (docs/MONEY-LAYER.md §5).
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { tenantId?: unknown; usd?: unknown } | null;
  if (typeof body?.tenantId !== "string" || typeof body?.usd !== "number") {
    return NextResponse.json({ success: false, error: 'Send {"tenantId": "...", "usd": 100}' }, { status: 400 });
  }
  try {
    const tenant = await getTenantById(body.tenantId);
    if (!tenant) return NextResponse.json({ success: false, error: "Unknown tenant" }, { status: 404 });

    const { withClient } = await import("@/lib/xrpl/client");
    const { TopUpError, topUpRentWallet } = await import("@/lib/xrpl/topup");
    try {
      const result = await withClient((client) =>
        topUpRentWallet(client, Wallet.fromSeed(envSeed("XRPL_BANK_SEED")), tenant.walletAddress, body.usd as number, tenant.capUsd));
      return NextResponse.json({ success: true, ...result });
    } catch (e) {
      if (e instanceof TopUpError) {
        const status = e.code === "wallet-full" || e.code === "bank-empty" ? 409 : 400;
        return NextResponse.json({ success: false, code: e.code, error: e.message }, { status });
      }
      throw e;
    }
  } catch (error) {
    console.error("Top-up failed:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ success: false, error: "Top-up failed" }, { status: 500 });
  }
}
