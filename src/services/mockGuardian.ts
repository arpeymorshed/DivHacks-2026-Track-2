import type {
  Tenant,
  PaymentIntent,
  GuardianDecision,
} from "../../types/rent";

export function checkPaymentIntent(
  tenant: Tenant,
  intent: PaymentIntent,
  landlordWallet: string
): GuardianDecision {
  if (intent.destination !== landlordWallet) {
    return {
      approved: false,
      reason: "Destination does not match verified landlord wallet",
    };
  }

  if (intent.amountUsd > tenant.capUsd) {
    return {
      approved: false,
      reason: `Payment exceeds tenant cap of $${tenant.capUsd}`,
    };
  }

  return {
    approved: true,
    reason: "Payment passed demo Guardian checks",
  };
}
