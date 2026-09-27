import type { PaymentIntent, MockPaymentResult } from "../../types/rent";

export async function submitMockPayment(
  intent: PaymentIntent
): Promise<MockPaymentResult> {
  return {
    success: true,
    status: "mock-paid",
    tenantId: intent.tenantId,
    amountUsd: intent.amountUsd,
    destination: intent.destination,
    txHash: `MOCK-${crypto.randomUUID()}`,
  };
}
