import type {
  Tenant,
  Due,
  PaymentIntent,
} from "../../types/rent";

export function createPaymentIntent(
  tenant: Tenant,
  due: Due,
  landlordWallet: string
): PaymentIntent {
  const totalAmount =
    due.rentUsd +
    due.utilitiesUsd +
    due.lateFeeUsd;

  return {
    tenantId: tenant.id,
    agentId: tenant.agentId,
    destination: landlordWallet,
    amountUsd: totalAmount,
    currency: "RLUSD",
    month: due.month,
    reason: due.reason,
  };
}
