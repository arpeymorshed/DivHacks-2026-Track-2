import {
  splitUtilityBill,
  splitUtilityBillByShares,
} from "./utilitySplit.ts";

console.log(
  "Equal split 100 / 3:",
  splitUtilityBill(100, ["a", "b", "c"])
);

console.log(
  "Unit 4B $76:",
  splitUtilityBillByShares(76, [
    { tenantId: "abhimanyu", share: 0.5 },
    { tenantId: "kashish", share: 0.5 },
  ])
);

console.log(
  "Unit 2A $52:",
  splitUtilityBillByShares(52, [
    { tenantId: "musammat", share: 1.0 },
  ])
);
