import {
  building,
  tenants,
  dues,
} from "../data/demoBuilding.ts";

import {
  createPaymentIntent,
} from "./tenantAgent.ts";

import type {
  PaymentIntent,
} from "../../types/rent";

export function runRentDay(): PaymentIntent[] {
  const paymentIntents: PaymentIntent[] = [];

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

    paymentIntents.push(intent);
  }

  return paymentIntents;
}
