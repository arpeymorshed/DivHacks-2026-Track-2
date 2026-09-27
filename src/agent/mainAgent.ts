import {
  getBuilding,
  getTenants,
  getTenantAgents,
  getDues,
} from "../services/rentRepository.ts";

import {
  createPaymentIntent,
} from "./tenantAgent.ts";

import { checkPaymentIntent } from "../services/mockGuardian.ts";
import { submitMockPayment } from "../services/mockXrpl.ts";
import { queueOutboxMessage } from "../services/outboxService.ts";
import { realPaymentsEnabled } from "../services/xrplConfig.ts";
import type { DemoClock } from "../services/demoState.ts";

import type {
  Building,
  Due,
  RentDayResult,
  Tenant,
} from "../../types/rent";

// Rent day. With the XRPL env configured (see docs/MONEY-LAYER.md §2), every tenant agent pays for real on
// XRPL Testnet through the live Guardian, using the demo clock (`clock`: today, month and run). Without it
// (or RENT_PAYMENTS=mock), the offline mocks are used; the unit tests rely on that.
export async function runRentDay(month = "2026-10", clock?: DemoClock): Promise<RentDayResult[]> {
  const real = realPaymentsEnabled();
  if (real && !clock) {
    throw new Error("Real rent day needs the demo clock (today, month, run); see src/services/demoState.ts");
  }
  const [building, tenants, tenantAgents, dues] = await Promise.all([
    getBuilding(),
    getTenants(),
    getTenantAgents(),
    getDues(month),
  ]);

  const payable: { tenant: Tenant; due: Due }[] = [];
  for (const tenant of tenants) {
    const due = dues.find(
      (due) => due.tenantId === tenant.id
    );

    if (!due) {
      console.warn(
        `No due found for ${tenant.name}`
      );
      continue;
    }

    const agent = tenantAgents.find((agent) => agent.tenantId === tenant.id);
    if (!agent) {
      console.warn(`No tenant agent found for ${tenant.name}`);
      continue;
    }
    payable.push({ tenant, due });
  }

  const results = real
    ? await payAllOnLedger(payable, building, clock!)
    : await payAllWithMocks(payable, building);

  // Messages go out in tenant order, after all payments are decided.
  for (const result of results) {
    const tenant = payable.find((p) => p.tenant.id === result.tenantId)!.tenant;
    await queueOutboxMessage(tenant.id, `${tenant.name}, your ${result.intent.month} total is $${result.intent.amountUsd}.`, `rent-due:${result.intent.month}:${tenant.id}`);
  }
  return results;
}

async function payAllWithMocks(payable: { tenant: Tenant; due: Due }[], building: Building): Promise<RentDayResult[]> {
  const results: RentDayResult[] = [];
  for (const { tenant, due } of payable) {
    const intent = createPaymentIntent(tenant, due, building.landlordWallet);
    const guardianDecision = checkPaymentIntent(tenant, intent, building.landlordWallet);
    const payment = guardianDecision.approved ? await submitMockPayment(intent) : null;
    results.push({ tenantId: tenant.id, intent, guardianDecision, payment });
  }
  return results;
}

// Tenants pay in parallel (each ledger tx takes ~4–8s); one tenant's failure never stops the others.
async function payAllOnLedger(payable: { tenant: Tenant; due: Due }[], building: Building, clock: DemoClock): Promise<RentDayResult[]> {
  const { payRentOnLedger, withLateFee } = await import("../services/xrplPayments.ts");
  const { getAgentSeed } = await import("../services/agentKeys.ts");
  return Promise.all(
    payable.map(async ({ tenant, due }): Promise<RentDayResult> => {
      const dueToday = withLateFee(due, tenant, clock);
      const intent = createPaymentIntent(tenant, dueToday, building.landlordWallet);
      try {
        const agentSeed = await getAgentSeed(tenant.id);
        const { guardianDecision, payment } = await payRentOnLedger({ tenant, due: dueToday, intent, clock, agentSeed });
        return { tenantId: tenant.id, intent, guardianDecision, payment };
      } catch (error) {
        console.error(`Rent payment failed for ${tenant.name}:`, error instanceof Error ? error.message : "UnknownError");
        return {
          tenantId: tenant.id,
          intent,
          guardianDecision: { approved: false, rule: "error", reason: "Payment could not be completed; nothing was paid. Try again." },
          payment: null,
        };
      }
    }),
  );
}
