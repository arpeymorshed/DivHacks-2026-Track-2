import { deepStrictEqual } from "node:assert/strict";
import {
  tenants,
  dues,
  building,
} from "../data/demoBuilding.ts";

import {
  createPaymentIntent,
} from "./tenantAgent.ts";

const abhimanyu = tenants.find(
  (tenant) => tenant.id === "abhimanyu"
);

const abhimanyuDue = dues.find(
  (due) => due.tenantId === "abhimanyu"
);

if (!abhimanyu || !abhimanyuDue) {
  throw new Error("Missing Abhimanyu demo data");
}

const intent = createPaymentIntent(
  abhimanyu,
  abhimanyuDue,
  building.landlordWallet
);

deepStrictEqual(intent, {
  tenantId: "abhimanyu",
  agentId: "agent-abhimanyu",
  destination: "rARPEY_DEMO",
  amountUsd: 1488,
  currency: "RLUSD",
  month: "2026-10",
  reason: "October rent + ConEd share",
});

console.log(intent);
