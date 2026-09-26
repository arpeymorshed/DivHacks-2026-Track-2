import {
  building,
  tenants,
  dues,
} from "../data/demoBuilding.ts";

import {
  createPaymentIntent,
} from "./tenantAgent.ts";

import { checkPaymentIntent } from "../services/mockGuardian.ts";
import { submitMockPayment } from "../services/mockXrpl.ts";

import type {
  RentDayResult,
} from "../../types/rent";

export async function runRentDay(): Promise<RentDayResult[]> {
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
      continue;
    }

    const payment = await submitMockPayment(intent);

    results.push({
      tenantId: tenant.id,
      intent,
      guardianDecision,
      payment,
    });
  }

  return results;
}
