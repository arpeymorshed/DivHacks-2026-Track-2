// Pure late-fee math (no xrpl). Kept out of xrplPayments so read-only routes like GET /api/state
// don't pull the XRPL client into the serverless bundle (that crash shows up as a bare HTML 500).
import { cycleDay, FEE_PER_DAY_USD, GRACE_DAYS, legalFeeCapUsd } from "../../guardian/rules";
import type { Due, Tenant } from "../../types/rent";
import type { DemoClock } from "./demoState.ts";

// The late fee the Guardian will accept on the demo date (T30): none on days 1–5, then $5/day from day 6,
// capped at min($50, 5% of the unit's rent). Day 8 → $15.
// - A tenant who has already paid this month owes no fee (and none is shown).
// - Only late roommates pay. If several roommates in the unit are late this month (unpaid, or paid with a
//   fee), the unit's cap is split by share. Fees the unit already paid come off what's left of the cap,
//   so together the roommates never pay more than the legal maximum for the unit, in any order.
export type LateFeeOpts = { paid?: boolean; lateRoommates?: number; unitFeesPaidUsd?: number };

export function withLateFee(due: Due, tenant: Tenant, clock: DemoClock, opts: LateFeeOpts = {}): Due {
  if (due.month !== clock.month) return due;
  if (opts.paid) return { ...due, daysLate: 0, lateFeeUsd: 0 };
  const day = cycleDay(clock.today, clock.month);
  const unitRentUsd = tenant.share > 0 ? due.rentUsd / tenant.share : due.rentUsd;
  const unitCap = legalFeeCapUsd(unitRentUsd);
  const shareCap = (opts.lateRoommates ?? 1) > 1 ? Math.floor(unitCap * tenant.share * 100) / 100 : unitCap;
  const cap = Math.min(shareCap, Math.max(0, unitCap - (opts.unitFeesPaidUsd ?? 0)));
  const fee = Math.min(cap, FEE_PER_DAY_USD * Math.max(0, day - GRACE_DAYS));
  return { ...due, daysLate: Math.max(0, day - 1), lateFeeUsd: fee };
}

export type PaidRent = { tenantId: string; amountUsd: number };
const round2 = (n: number) => Math.round(n * 100) / 100;

// The late-fee inputs for one tenant, from the tenants who have a due this month (grouped by unit) and this
// month + run's paid rent. Used by both rent day and GET /api/state so they always agree.
export function lateFeeOpts(tenant: Tenant, all: { tenant: Tenant; due: Due }[], paidRent: PaidRent[]): LateFeeOpts {
  const feePaid = (x: { tenant: Tenant; due: Due }): number | null => {
    const p = paidRent.find((r) => r.tenantId === x.tenant.id);
    return p ? Math.max(0, round2(p.amountUsd - x.due.rentUsd - x.due.utilitiesUsd)) : null; // null = unpaid
  };
  const unit = all.filter((x) => x.tenant.unitId === tenant.unitId);
  const self = unit.find((x) => x.tenant.id === tenant.id);
  return {
    paid: self ? feePaid(self) !== null : false,
    lateRoommates: unit.filter((x) => { const f = feePaid(x); return f === null || f > 0; }).length,
    unitFeesPaidUsd: round2(unit.reduce((sum, x) => sum + (feePaid(x) ?? 0), 0)),
  };
}
