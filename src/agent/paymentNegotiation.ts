import type { Due } from "../../types/rent.ts";

export type PayLaterDecision = {
  approved: boolean;
  payLaterUntil?: string;
  reason: string;
};

export function evaluatePayLaterRequest(
  due: Due,
  requestedDay: number | null
): PayLaterDecision {
  if (requestedDay === null) {
    return {
      approved: false,
      reason: "Please specify which day you want to pay.",
    };
  }

  if (!Number.isInteger(requestedDay) || requestedDay < 1 || requestedDay > 31) {
    return {
      approved: false,
      reason: "The requested payment day is invalid.",
    };
  }

  // Rent is due on the 1st. Days 1-5 are the no-fee grace period.
  if (requestedDay > 5) {
    return {
      approved: false,
      reason: "The requested date is outside the grace period, which ends on the 5th.",
    };
  }

  // If the account is already beyond the grace period, don't create a new arrangement.
  if (due.daysLate > 5 || due.lateFeeUsd > 0) {
    return {
      approved: false,
      reason: "This balance is already outside the grace period.",
    };
  }

  const payLaterUntil =
    `${due.month}-${String(requestedDay).padStart(2, "0")}`;

  return {
    approved: true,
    payLaterUntil,
    reason: `Payment can be scheduled for ${payLaterUntil} within the grace period.`,
  };
}
