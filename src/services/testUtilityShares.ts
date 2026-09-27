import { splitUtilityBill } from "../agent/utilitySplit.ts";
import { setUtilityShares } from "./rentRepository.ts";

const shares = splitUtilityBill(
  114,
  ["abhimanyu", "kashish", "musammat"]
);

console.log("Calculated shares:", shares);

const updated = await setUtilityShares(
  "2026-10",
  shares
);

console.log(
  "Updated dues:",
  updated.map((due) => ({
    tenantId: due.tenantId,
    utilitiesUsd: due.utilitiesUsd,
  }))
);
