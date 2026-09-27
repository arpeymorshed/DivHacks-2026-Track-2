import type { Due } from "../../types/rent.ts";

export type PayLaterDecision = {
  approved: boolean;
  payLaterUntil?: string;
  reason: string;
};

export function evaluatePayLaterRequest(
  due: Due,
  requestedDay: number | null,
  now: Date = new Date()
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

  const requestedIso =
    `${due.month}-${String(requestedDay).padStart(2, "0")}`;

  const requestedDate = new Date(`${requestedIso}T00:00:00Z`);

  // Reject impossible dates such as February 31.
  if (
    Number.isNaN(requestedDate.getTime()) ||
    requestedDate.toISOString().slice(0, 10) !== requestedIso
  ) {
    return {
      approved: false,
      reason: "The requested payment date is invalid.",
    };
  }

  const dueDate = new Date(`${due.dueDate}T00:00:00Z`);

  if (Number.isNaN(dueDate.getTime())) {
    return {
      approved: false,
      reason: "The rent due date is invalid.",
    };
  }

  // RentRelay gives a 5-day grace window beginning on the due date.
  const graceEnd = new Date(dueDate);
  graceEnd.setUTCDate(graceEnd.getUTCDate() + 4);

  if (requestedDate < dueDate || requestedDate > graceEnd) {
    return {
      approved: false,
      reason:
        `The requested date is outside the grace period, which ends on `
        + `${graceEnd.toISOString().slice(0, 10)}.`,
    };
  }

  const today = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
  );

  if (requestedDate < today) {
    return {
      approved: false,
      reason: "That requested payment date has already passed.",
    };
  }

  if (due.daysLate > 5 || due.lateFeeUsd > 0) {
    return {
      approved: false,
      reason: "This balance is already outside the grace period.",
    };
  }

  return {
    approved: true,
    payLaterUntil: requestedIso,
    reason:
      `Payment can be scheduled for ${requestedIso} `
      + `within the grace period.`,
  };
}
