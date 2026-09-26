import { deepStrictEqual } from "node:assert/strict";
import { runRentDay } from "./mainAgent.ts";
import { dues } from "../data/demoBuilding.ts";

const intents = runRentDay();

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

// A missing due must skip only that tenant and warn without stopping rent day.
const originalDues = [...dues];
const originalWarn = console.warn;
const warnings: string[] = [];
try {
  dues.splice(1, 1);
  console.warn = (message: string) => warnings.push(message);
  deepStrictEqual(runRentDay(), [intents[0], intents[2]]);
  deepStrictEqual(warnings, ["No due found for Kashish"]);
} finally {
  dues.splice(0, dues.length, ...originalDues);
  console.warn = originalWarn;
}

console.log(JSON.stringify(intents, null, 2));
