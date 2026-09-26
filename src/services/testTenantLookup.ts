import { equal } from "node:assert/strict";

// Synthetic 555-01xx fixtures; never use or print the team's local numbers.
process.env.DEMO_MAYA_PHONE = "+12125550101";
process.env.DEMO_JORDAN_PHONE = "+12125550102";
process.env.DEMO_PRIYA_PHONE = "+12125550103";
process.env.DEMO_SPARE_PHONE = "+12125550104";

// Load the demo data only after this test's environment is configured.
const { getTenantByPhone } = await import("./tenantLookup.ts");
const { tenants } = await import("../data/demoBuilding.ts");

equal(getTenantByPhone("+12125550101")?.id, "maya");
equal(getTenantByPhone("+12125550101")?.agentId, "agent-maya");
equal(getTenantByPhone("+12125550102")?.id, "jordan");
equal(getTenantByPhone("+12125550103")?.id, "priya");
equal(getTenantByPhone("+12125550104"), undefined);
equal(getTenantByPhone("+12125550199"), undefined);
equal(getTenantByPhone(""), undefined);
equal(getTenantByPhone("(212) 555-0101"), undefined);
equal(getTenantByPhone("12125550101"), undefined);
equal(getTenantByPhone(" +12125550101"), undefined);

// A missing environment variable must not make an empty sender select a tenant.
tenants[0].phoneNumber = "";
equal(getTenantByPhone(""), undefined);
equal(getTenantByPhone("+12125550101"), undefined);

console.log("Tenant phone lookup checks passed.");
