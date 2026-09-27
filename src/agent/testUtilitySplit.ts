import strictAssert from "node:assert/strict";
import {
  MAX_UTILITIES_USD,
  splitUtilityBill,
  splitUtilityBillByShares,
  unitChargeFor,
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

// Sub-metered building bill (fixtures/utility-bill-building.png): "Unit 4B $76.00", "Unit 2A $38.00", total $114.
{
  const bill = { totalUsd: 114, units: [{ unit: "Unit 4B", chargeUsd: 76 }, { unit: "2A", chargeUsd: 38 }] };
  strictAssert.equal(unitChargeFor(bill, "4B"), 76);
  strictAssert.equal(unitChargeFor(bill, "2A"), 38);
  strictAssert.equal(unitChargeFor(bill, "3C"), null); // bill lists units, none for this one → route refuses (400)
  strictAssert.equal(unitChargeFor({ totalUsd: 90, units: [] }, "4B"), 90); // no per-unit lines → the whole total
  strictAssert.deepEqual(splitUtilityBillByShares(76, [{ tenantId: "abhimanyu", share: 0.5 }, { tenantId: "kashish", share: 0.5 }]),
    [{ tenantId: "abhimanyu", amountUsd: 38 }, { tenantId: "kashish", amountUsd: 38 }]);
  strictAssert.deepEqual(splitUtilityBillByShares(38, [{ tenantId: "musammat", share: 1 }]), [{ tenantId: "musammat", amountUsd: 38 }]);
  // The old behaviour (building total into 2A) would be $114 > the Guardian's $100 limit → the route refuses it.
  strictAssert.equal(splitUtilityBillByShares(114, [{ tenantId: "musammat", share: 1 }])[0].amountUsd > MAX_UTILITIES_USD, true);
  console.log("Per-unit bill split checks passed: 4B $38/$38, 2A $38, missing unit → null, over-limit detected.");
}
