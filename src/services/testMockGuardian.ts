import { deepStrictEqual } from "node:assert/strict";
import { building, tenants, dues } from "../data/demoBuilding.ts";
import { createPaymentIntent } from "../agent/tenantAgent.ts";
import { checkPaymentIntent } from "./mockGuardian.ts";

const tenant = tenants[0];
const intent = createPaymentIntent(tenant, dues[0], building.landlordWallet);

deepStrictEqual(checkPaymentIntent(tenant, intent, building.landlordWallet), {
  approved: true,
  reason: "Payment passed demo Guardian checks",
});

deepStrictEqual(
  checkPaymentIntent(tenant, { ...intent, destination: "rWRONG_DEMO" }, building.landlordWallet),
  { approved: false, reason: "Destination does not match verified landlord wallet" }
);

deepStrictEqual(
  checkPaymentIntent(tenant, { ...intent, amountUsd: tenant.capUsd }, building.landlordWallet),
  { approved: true, reason: "Payment passed demo Guardian checks" }
);

deepStrictEqual(
  checkPaymentIntent(tenant, { ...intent, amountUsd: tenant.capUsd + 1 }, building.landlordWallet),
  { approved: false, reason: `Payment exceeds tenant cap of $${tenant.capUsd}` }
);

console.log("Mock Guardian checks passed: verified destination and cap boundary.");
