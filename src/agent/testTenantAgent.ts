import { deepStrictEqual } from "node:assert/strict";
import {
  tenants,
  dues,
  building,
} from "../data/demoBuilding.ts";

import {
  createPaymentIntent,
} from "./tenantAgent.ts";

const maya = tenants.find(
  (tenant) => tenant.id === "maya"
);

const mayaDue = dues.find(
  (due) => due.tenantId === "maya"
);

if (!maya || !mayaDue) {
  throw new Error("Missing Maya demo data");
}

const intent = createPaymentIntent(
  maya,
  mayaDue,
  building.landlordWallet
);

deepStrictEqual(intent, {
  tenantId: "maya",
  agentId: "agent-maya",
  destination: "rLANDLORD_DEMO",
  amountUsd: 1488,
  currency: "RLUSD",
  month: "2026-10",
  reason: "October rent + ConEd share",
});

console.log(intent);
