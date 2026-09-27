// Pure late-fee math (no xrpl). Kept out of xrplPayments so read-only routes like GET /api/state
// don't pull the XRPL client into the serverless bundle (that crash shows up as a bare HTML 500).
import { cycleDay, FEE_PER_DAY_USD, GRACE_DAYS, legalFeeCapUsd } from "../../guardian/rules";
import type { Due, Tenant } from "../../types/rent";
import type { DemoClock } from "./demoState.ts";

// The late fee the Guardian will accept on the demo date (T30): none on days 1–5, then $5/day from day 6,
// capped at min($50, 5% of the unit's rent). Day 8 → $15.
// - A tenant who has already paid this month owes no fee (and none is shown).
// - Only late roommates pay. If several roommates in the unit are late (unpaid), the unit's cap is split
//   by share, so together they never pay more than the legal maximum for the unit.
export function withLateFee(
  due: Due,
  tenant: Tenant,
  clock: DemoClock,
  opts: { paid?: boolean; lateRoommates?: number } = {},
): Due {
  if (due.month !== clock.month) return due;
  if (opts.paid) return { ...due, daysLate: 0, lateFeeUsd: 0 };
  const day = cycleDay(clock.today, clock.month);
  const unitRentUsd = tenant.share > 0 ? due.rentUsd / tenant.share : due.rentUsd;
  const unitCap = legalFeeCapUsd(unitRentUsd);
  const cap = (opts.lateRoommates ?? 1) > 1 ? Math.floor(unitCap * tenant.share * 100) / 100 : unitCap;
  const fee = Math.min(cap, FEE_PER_DAY_USD * Math.max(0, day - GRACE_DAYS));
  return { ...due, daysLate: Math.max(0, day - 1), lateFeeUsd: fee };
}
