export type UtilityShare = {
  tenantId: string;
  amountUsd: number;
};

export function splitUtilityBill(
  totalUsd: number,
  tenantIds: string[]
): UtilityShare[] {
  if (!Number.isFinite(totalUsd) || totalUsd < 0) {
    throw new Error("Utility total must be a valid non-negative number");
  }

  if (tenantIds.length === 0) {
    throw new Error("At least one tenant is required");
  }

  // Work in cents so floating-point math cannot lose money.
  const totalCents = Math.round(totalUsd * 100);
  const baseCents = Math.floor(totalCents / tenantIds.length);
  let remainderCents = totalCents % tenantIds.length;

  return tenantIds.map((tenantId) => {
    const extraCent = remainderCents > 0 ? 1 : 0;

    if (remainderCents > 0) {
      remainderCents -= 1;
    }

    return {
      tenantId,
      amountUsd: (baseCents + extraCent) / 100,
    };
  });
}
