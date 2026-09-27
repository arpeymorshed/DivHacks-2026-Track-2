import { NextResponse } from "next/server";
import { ATTACKS, type AttackName, runAttack } from "@/lib/xrpl/attacks";
import { withClient } from "@/lib/xrpl/client";
import { getAgentSeed } from "@/services/agentKeys";
import { recordActivitySafe } from "@/services/activityLog";
import { clockOf, getDemoState } from "@/services/demoState";
import { getBuilding, getDueForTenant, getTenantById } from "@/services/rentRepository";

export const runtime = "nodejs";
export const maxDuration = 30;

// T37: "What could go wrong?" Fires a real agent-signed attack at a tenant's rent wallet and returns who
// blocked it (Guardian or the ledger itself). Never submits an approved payment; costs no RLUSD.
// The target is built here on the server; only the tenant id may come from the request.
export async function POST(req: Request, { params }: { params: { name: string } }) {
  if (!(params.name in ATTACKS)) {
    return NextResponse.json({ success: false, error: `Unknown attack. Try: ${Object.keys(ATTACKS).join(", ")}` }, { status: 404 });
  }
  const body = (await req.json().catch(() => ({}))) as { tenantId?: unknown };
  const tenantId = typeof body?.tenantId === "string" ? body.tenantId : "abhimanyu";
  try {
    const clock = clockOf(await getDemoState()); // runAttack moves an out-of-window date to the 1st
    const [tenant, building, due] = await Promise.all([getTenantById(tenantId), getBuilding(), getDueForTenant(tenantId, clock.month)]);
    if (!tenant || !due) return NextResponse.json({ success: false, error: "Unknown tenant or no due this month" }, { status: 404 });

    const agentSeed = await getAgentSeed(tenant.id);
    const result = await withClient((client) =>
      runAttack(client, params.name as AttackName, {
        tenantId: tenant.id,
        walletAddress: tenant.walletAddress,
        agentSeed,
        landlordAddress: building.landlordWallet,
        rentShareUsd: due.rentUsd,
        utilitiesUsd: due.utilitiesUsd,
        clock,
      }),
    );
    // "not-ready" (double charge before rent day) isn't an attack result; the UI shows "run after rent day".
    if (result.rule !== "not-ready") {
      await recordActivitySafe({
        run: clock.run, month: clock.month, kind: "attack", tenantId: tenant.id, title: result.title,
        status: result.blocked ? "blocked" : "failed", rule: result.rule, reason: result.reason,
        blockedBy: result.blockedBy ?? undefined, amountUsd: result.audit.intent.totalUsd,
      });
    }
    return NextResponse.json({ success: true, live: ATTACKS[params.name as AttackName].live, ...result });
  } catch (error) {
    console.error("Attack scenario failed:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ success: false, error: "Attack scenario failed" }, { status: 500 });
  }
}
