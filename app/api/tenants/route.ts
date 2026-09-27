import { Wallet } from "xrpl";
import { withClient } from "@/lib/xrpl/client";
import { spawnRentWallet } from "@/lib/xrpl/spawn";
import { getDb } from "@/lib/mongodb";
import { saveAgentSeed } from "@/services/agentKeys";
import { clockOf, getDemoState } from "@/services/demoState";
import { getTenants } from "@/services/rentRepository";
import { envSeed } from "@/services/xrplConfig";
import { recordActivitySafe } from "@/services/activityLog";
import type { Building, Due, Tenant, TenantAgent } from "@/types/rent";

export const runtime = "nodejs";
export const maxDuration = 60; // ~28s: 6 ledger transactions

const MAX_SPAWNED = 5; // each spawn costs the ops account ~2.6 test XRP; the route is public in the demo
const SEED_TENANTS = 3;

// T35: the landlord adds a tenant → the main agent spawns a two-key rent wallet with an on-chain agent
// credential, live. Streams one JSON line per step (for the console animation), then a "done" line.
// Security: the stream carries only step labels, explorer links and public addresses. The tenant's backup
// key is never sent, logged or stored here; the agent key is stored encrypted (src/services/agentKeys.ts).
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!/^[A-Za-z][A-Za-z '-]{0,29}$/.test(name)) {
    return Response.json({ success: false, error: 'Send {"name": "Sam"} (letters, up to 30 characters)' }, { status: 400 });
  }
  const id = name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
  let tenants: Tenant[];
  try {
    // Check every piece of config first: a spawn funds a wallet on-ledger (~2.6 XRP), which is wasted
    // if the agent key can't then be encrypted and saved (REVIEW.md PR #16 should-fix 1).
    for (const name of ["AGENT_KEY_SECRET", "XRPL_OPS_SEED", "XRPL_LANDLORD_SEED", "GUARDIAN_ADDRESS"]) envSeed(name);
    tenants = await getTenants(); // also proves MongoDB is reachable
  } catch (error) {
    console.error("Spawn failed:", error instanceof Error ? error.name : "UnknownError");
    return Response.json({ success: false, error: "Spawn failed" }, { status: 500 });
  }
  if (tenants.some((t) => t.id === id)) return Response.json({ success: false, error: "That tenant already exists" }, { status: 409 });
  if (tenants.length - SEED_TENANTS >= MAX_SPAWNED) {
    return Response.json({ success: false, error: `Demo limit: at most ${MAX_SPAWNED} new tenants` }, { status: 409 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const limits = { tenantId: id, capUsd: 1600, unitRentUsd: 1450, rentShareUsd: 1450, maxUtilitiesUsd: 100 };
        const spawned = await withClient((client) =>
          spawnRentWallet(client, {
            ops: Wallet.fromSeed(envSeed("XRPL_OPS_SEED")),
            landlord: Wallet.fromSeed(envSeed("XRPL_LANDLORD_SEED")),
            guardianAddress: envSeed("GUARDIAN_ADDRESS"),
            limits,
            onStep: (s) => send({ type: "step", ...s }),
          }),
        );
        const { address, agentAddress, agentSeed } = spawned; // backupSeed deliberately dropped here

        const db = await getDb();
        const clock = clockOf(await getDemoState());
        const unitId = `unit-${id}`;
        const tenant: Tenant = { id, name, unitId, share: 1, capUsd: limits.capUsd, walletAddress: address, agentId: `agent-${id}`, phoneNumber: "" };
        const agent: TenantAgent = { id: `agent-${id}`, tenantId: id, status: "active", credentialId: "RentRelayTenantAgent" };
        const due: Due = { tenantId: id, month: clock.month, rentUsd: limits.rentShareUsd, utilitiesUsd: 0, dueDate: `${clock.month}-01`,
          daysLate: 0, lateFeeUsd: 0, reason: `${clock.month} rent` };
        await saveAgentSeed(id, agentAddress, agentSeed);
        await db.collection<Tenant>("tenants").updateOne({ id }, { $set: tenant }, { upsert: true });
        await db.collection<TenantAgent>("tenantAgents").updateOne({ id: agent.id }, { $set: agent }, { upsert: true });
        await db.collection<Due>("dues").updateOne({ tenantId: id, month: due.month }, { $set: due }, { upsert: true });
        await db.collection<Building>("buildings").updateOne(
          { id: "building-1", "units.id": { $ne: unitId } },
          { $push: { units: { id: unitId, name: "3C", tenantIds: [id] } } },
        );
        const credentialStep = spawned.steps.find((s) => s.step === "credential-issued");
        await recordActivitySafe({
          run: clock.run, month: clock.month, kind: "spawn", tenantId: id, title: `New tenant agent: ${name}`, status: "done",
          reason: `Rent wallet ${address} funded, credentialed and locked to two keys`,
          txHash: credentialStep?.txHash, explorerUrl: credentialStep?.explorer,
        });
        send({ type: "done", tenant: { id, name, walletAddress: address, agentAddress } });
      } catch (error) {
        console.error("Spawn failed:", error instanceof Error ? error.name : "UnknownError");
        send({ type: "error", error: "Spawn failed partway; nothing to clean up in the app. Try again." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" } });
}
