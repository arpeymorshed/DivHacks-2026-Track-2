import { deepStrictEqual, equal, match, ok } from "node:assert/strict";
import { runRentDay } from "./mainAgent.ts";
import { dues, tenants } from "../data/demoBuilding.ts";
import { outbox } from "../data/outbox.ts";

equal(outbox.length, 0);
const results = await runRentDay();
const intents = results.map((result) => result.intent);

deepStrictEqual(outbox.map(({ tenantId, text }) => ({ tenantId, text })), [
  { tenantId: "abhimanyu", text: "Abhimanyu, your 2026-10 total is $1488." },
  { tenantId: "kashish", text: "Kashish, your 2026-10 total is $1488." },
  { tenantId: "musammat", text: "Musammat, your 2026-10 total is $1952." },
]);
equal(new Set(outbox.map((message) => message.id)).size, 3);

deepStrictEqual(intents, [
  {
    tenantId: "abhimanyu",
    agentId: "agent-abhimanyu",
    destination: "rARPEY_DEMO",
    amountUsd: 1488,
    currency: "RLUSD",
    month: "2026-10",
    reason: "October rent + ConEd share",
  },
  {
    tenantId: "kashish",
    agentId: "agent-kashish",
    destination: "rARPEY_DEMO",
    amountUsd: 1488,
    currency: "RLUSD",
    month: "2026-10",
    reason: "October rent + ConEd share",
  },
  {
    tenantId: "musammat",
    agentId: "agent-musammat",
    destination: "rARPEY_DEMO",
    amountUsd: 1952,
    currency: "RLUSD",
    month: "2026-10",
    reason: "October rent + ConEd share",
  },
]);

for (const result of results) {
  equal(result.tenantId, result.intent.tenantId);
  deepStrictEqual(result.guardianDecision, {
    approved: true,
    reason: "Payment passed demo Guardian checks",
  });
  ok(result.payment);
  match(result.payment.txHash, /^MOCK-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  deepStrictEqual(result.payment, {
    success: true,
    status: "mock-paid",
    tenantId: result.tenantId,
    amountUsd: result.intent.amountUsd,
    destination: "rARPEY_DEMO",
    txHash: result.payment.txHash,
  });
}
equal(new Set(results.map((result) => result.payment?.txHash)).size, 3);

// A cap rejection must not produce a payment or stop the other tenants.
const originalCap = tenants[0].capUsd;
try {
  tenants[0].capUsd = 1000;
  const rejectedResults = await runRentDay();
  equal(rejectedResults.length, 3);
  deepStrictEqual(rejectedResults[0], {
    tenantId: "abhimanyu",
    intent: intents[0],
    guardianDecision: {
      approved: false,
      reason: "Payment exceeds tenant cap of $1000",
    },
    payment: null,
  });
  for (const result of rejectedResults.slice(1)) {
    equal(result.guardianDecision.approved, true);
    equal(result.payment?.status, "mock-paid");
  }
  equal(outbox.length, 6);
  equal(outbox[3].text, "Abhimanyu, your 2026-10 total is $1488.");
} finally {
  tenants[0].capUsd = originalCap;
}

// A missing due must skip only that tenant and warn without stopping rent day.
const originalDues = [...dues];
const originalWarn = console.warn;
const warnings: string[] = [];
try {
  dues.splice(1, 1);
  console.warn = (message: string) => warnings.push(message);
  const remainingResults = await runRentDay();
  deepStrictEqual(remainingResults.map((result) => result.intent), [intents[0], intents[2]]);
  deepStrictEqual(warnings, ["No due found for Kashish"]);
  deepStrictEqual(outbox.slice(6).map((message) => message.tenantId), ["abhimanyu", "musammat"]);
} finally {
  dues.splice(0, dues.length, ...originalDues);
  console.warn = originalWarn;
}

console.log("Rent-day checks passed: mock payments, cap rejection, missing due, and queued messages.");
