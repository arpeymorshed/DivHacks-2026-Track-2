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

export type WeightedUtilityTenant = {
  tenantId: string;
  share: number;
};

export function splitUtilityBillByShares(
  totalUsd: number,
  tenants: WeightedUtilityTenant[]
): UtilityShare[] {
  if (!Number.isFinite(totalUsd) || totalUsd < 0) {
    throw new Error("Utility total must be a valid non-negative number");
  }

  if (tenants.length === 0) {
    throw new Error("At least one tenant is required");
  }

  const tenantIds = tenants.map((tenant) => tenant.tenantId);

  if (new Set(tenantIds).size !== tenantIds.length) {
    throw new Error("Duplicate tenant IDs are not allowed");
  }

  for (const tenant of tenants) {
    if (
      !tenant.tenantId ||
      !Number.isFinite(tenant.share) ||
      tenant.share <= 0
    ) {
      throw new Error("Invalid tenant utility share");
    }
  }

  const totalShare = tenants.reduce(
    (sum, tenant) => sum + tenant.share,
    0
  );

  if (Math.abs(totalShare - 1) > 0.000001) {
    throw new Error("Tenant shares must add up to 1");
  }

  const totalCents = Math.round(totalUsd * 100);

  const allocations = tenants.map((tenant, index) => {
    const exactCents = totalCents * tenant.share;
    const cents = Math.floor(exactCents);

    return {
      tenantId: tenant.tenantId,
      cents,
      remainder: exactCents - cents,
      index,
    };
  });

  let remainingCents =
    totalCents -
    allocations.reduce(
      (sum, allocation) => sum + allocation.cents,
      0
    );

  const remainderOrder = [...allocations].sort(
    (a, b) =>
      b.remainder - a.remainder ||
      a.index - b.index
  );

  for (let i = 0; i < remainingCents; i += 1) {
    remainderOrder[i].cents += 1;
  }

  return allocations.map((allocation) => ({
    tenantId: allocation.tenantId,
    amountUsd: allocation.cents / 100,
  }));
}

// The Guardian's per-tenant utilities limit (guardian policy maxUtilitiesUsd). Shares above it would make
// every rent payment for that tenant refused, so the bill route rejects them instead of writing them.
export const MAX_UTILITIES_USD = 100;

const normUnit = (s: string) => s.toLowerCase().replace(/\bunit\b|apt\.?|apartment|#|\s/g, "");

// The amount the selected unit owes: its own line on a sub-metered bill, or the whole total when the
// bill has no per-unit lines. null when the bill has unit lines but none for this unit.
export function unitChargeFor(bill: { totalUsd: number; units: { unit: string; chargeUsd: number }[] }, unitName: string): number | null {
  if (bill.units.length === 0) return bill.totalUsd;
  const line = bill.units.find((u) => normUnit(u.unit) === normUnit(unitName));
  return line ? line.chargeUsd : null;
}
