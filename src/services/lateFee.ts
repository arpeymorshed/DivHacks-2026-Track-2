// Pure late-fee math (no xrpl). Kept out of xrplPayments so read-only routes like GET /api/state
// don't pull the XRPL client into the serverless bundle (that crash shows up as a bare HTML 500).
import { cycleDay, FEE_PER_DAY_USD, GRACE_DAYS, legalFeeCapUsd } from "../../guardian/rules";
import type { Due, Tenant } from "../../types/rent";
import type { DemoClock } from "./demoState.ts";

// The late fee the Guardian will accept on the demo date: none on days 1–5, then $5/day from day 6,
// capped at min($50, 5% of the unit's rent). Day 8 → $15. Only applied once the due date has passed.
export function withLateFee(due: Due, tenant: Tenant, clock: DemoClock): Due {
  if (due.month !== clock.month) return due;
  const day = cycleDay(clock.today, clock.month);
  const unitRentUsd = tenant.share > 0 ? due.rentUsd / tenant.share : due.rentUsd;
  const fee = Math.min(legalFeeCapUsd(unitRentUsd), FEE_PER_DAY_USD * Math.max(0, day - GRACE_DAYS));
  return { ...due, daysLate: Math.max(0, day - 1), lateFeeUsd: fee };
}
