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

import type {
  RentDayResult,
} from "../../types/rent";

export async function runRentDay(month = "2026-10"): Promise<RentDayResult[]> {
  const [building, tenants, tenantAgents, dues] = await Promise.all([
    getBuilding(),
    getTenants(),
    getTenantAgents(),
    getDues(month),
  ]);
  const results: RentDayResult[] = [];

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

    const intent = createPaymentIntent(
      tenant,
      due,
      building.landlordWallet
    );

    const guardianDecision = checkPaymentIntent(
      tenant,
      intent,
      building.landlordWallet
    );

    if (!guardianDecision.approved) {
      results.push({
        tenantId: tenant.id,
        intent,
        guardianDecision,
        payment: null,
      });
      await queueOutboxMessage(tenant.id, `${tenant.name}, your ${due.month} total is $${intent.amountUsd}.`, `rent-due:${due.month}:${tenant.id}`);
      continue;
    }

    const payment = await submitMockPayment(intent);

    results.push({
      tenantId: tenant.id,
      intent,
      guardianDecision,
      payment,
    });
    await queueOutboxMessage(tenant.id, `${tenant.name}, your ${due.month} total is $${intent.amountUsd}.`, `rent-due:${due.month}:${tenant.id}`);
  }

  return results;
}
