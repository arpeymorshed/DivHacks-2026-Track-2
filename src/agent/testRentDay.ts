import { deepStrictEqual, equal, match, ok } from "node:assert/strict";
import { mock } from "node:test";
import { building, dues, tenants, tenantAgents } from "../data/demoBuilding.ts";
const outbox: { tenantId: string; text: string; dedupeKey: string }[] = [];
mock.module("../services/outboxService.ts", {
  namedExports: {
    queueOutboxMessage: async (tenantId: string, text: string, dedupeKey: string) => {
      outbox.push({ tenantId, text, dedupeKey });
    },
  },
});

// Keep unit tests offline; production uses the MongoDB repository.
mock.module("../services/rentRepository.ts", {
  namedExports: {
    getBuilding: async () => building,
    getTenants: async () => tenants,
    getTenantAgents: async () => tenantAgents,
    getDues: async (month: string) => dues.filter((due) => due.month === month),
  },
});
const { runRentDay } = await import("./mainAgent.ts");

equal(outbox.length, 0);
const results = await runRentDay();
const intents = results.map((result) => result.intent);

deepStrictEqual(outbox.map(({ tenantId, text }) => ({ tenantId, text })), [
  { tenantId: "abhimanyu", text: "Abhimanyu, your 2026-10 total is $1488." },
  { tenantId: "kashish", text: "Kashish, your 2026-10 total is $1488." },
  { tenantId: "musammat", text: "Musammat, your 2026-10 total is $1488." },
]);
deepStrictEqual(outbox.map((message) => message.dedupeKey), [
  "rent-due:2026-10:abhimanyu",
  "rent-due:2026-10:kashish",
  "rent-due:2026-10:musammat",
]);

deepStrictEqual(intents, [
  {
    tenantId: "abhimanyu",
    agentId: "agent-abhimanyu",
    destination: "rLD4K9gFjsGMwVormQmV8DBfGkJWfVVxZS",
    amountUsd: 1488,
    currency: "RLUSD",
    month: "2026-10",
    reason: "October rent + ConEd share",
  },
  {
    tenantId: "kashish",
    agentId: "agent-kashish",
    destination: "rLD4K9gFjsGMwVormQmV8DBfGkJWfVVxZS",
    amountUsd: 1488,
    currency: "RLUSD",
    month: "2026-10",
    reason: "October rent + ConEd share",
  },
  {
    tenantId: "musammat",
    agentId: "agent-musammat",
    destination: "rLD4K9gFjsGMwVormQmV8DBfGkJWfVVxZS",
    amountUsd: 1488,
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
    destination: "rLD4K9gFjsGMwVormQmV8DBfGkJWfVVxZS",
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

// A tenant without a stored agent must not receive a payment or queued message.
const originalAgents = [...tenantAgents];
const queuedBeforeMissingAgent = outbox.length;
try {
  tenantAgents.splice(2, 1);
  warnings.length = 0;
  console.warn = (message: string) => warnings.push(message);
  const remainingResults = await runRentDay();
  deepStrictEqual(remainingResults.map((result) => result.tenantId), ["abhimanyu", "kashish"]);
  deepStrictEqual(warnings, ["No tenant agent found for Musammat"]);
  equal(outbox.length, queuedBeforeMissingAgent + 2);
} finally {
  tenantAgents.splice(0, tenantAgents.length, ...originalAgents);
  console.warn = originalWarn;
}

// An unseeded month must not fall back to October's dues.
const queuedBeforeOtherMonth = outbox.length;
try {
  console.warn = () => undefined;
  deepStrictEqual(await runRentDay("2026-11"), []);
  equal(outbox.length, queuedBeforeOtherMonth);
} finally {
  console.warn = originalWarn;
  mock.restoreAll();
}

console.log("Rent-day checks passed: repository reads, month filtering, missing agents/dues, mock payments, cap rejection, and queued messages.");
