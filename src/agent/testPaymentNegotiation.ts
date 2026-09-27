import { evaluatePayLaterRequest } from "./paymentNegotiation.ts";
import type { Due } from "../../types/rent.ts";

const due: Due = {
  tenantId: "abhimanyu",
  month: "2026-10",
  rentUsd: 1450,
  utilitiesUsd: 38,
  dueDate: "2026-10-01",
  daysLate: 0,
  lateFeeUsd: 0,
  reason: "October rent + ConEd share",
};

console.log("Day 5:", evaluatePayLaterRequest(due, 5));
console.log("Day 8:", evaluatePayLaterRequest(due, 8));
console.log("No day:", evaluatePayLaterRequest(due, null));
