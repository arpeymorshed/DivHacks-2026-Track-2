// Offline checks for GET /api/state's derived fields (stage + paid detection). Run: npm run test:state
import assert from "node:assert/strict";
import { test } from "node:test";
import type { ActivityEntry, Due } from "../../types/rent";
import { paymentFor, stageOf } from "./stateService.ts";
import { lateFeeOpts, withLateFee } from "./lateFee.ts";

const due: Due = { tenantId: "kashish", month: "2026-10", rentUsd: 1450, utilitiesUsd: 38, dueDate: "2026-10-01", daysLate: 0, lateFeeUsd: 0, reason: "rent" };
const clock = (today: string, run = 7) => ({ today, month: "2026-10", run });
const kashish = { id: "kashish", name: "Kashish", unitId: "unit-4b", share: 0.5, capUsd: 1600, walletAddress: "r", agentId: "a", phoneNumber: "" };

test("stage follows the demo date: upcoming → due → grace → late", () => {
  assert.equal(stageOf(due, clock("2026-09-28"), false), "upcoming");
  assert.equal(stageOf(due, clock("2026-10-01"), false), "due");
  assert.equal(stageOf(due, clock("2026-10-05"), false), "grace");
  assert.equal(stageOf(due, clock("2026-10-06"), false), "late");
  assert.equal(stageOf(due, clock("2026-10-08"), true), "paid");
});

test("late fee shown matches what the Guardian accepts (day 8 = $15, day 5 = $0)", () => {
  assert.equal(withLateFee(due, kashish, clock("2026-10-08")).lateFeeUsd, 15);
  assert.equal(withLateFee(due, kashish, clock("2026-10-05")).lateFeeUsd, 0);
});

test("T30: a paid tenant owes no fee; late roommates split the unit's cap by share", () => {
  // Unit 4B: $2,900 → legal cap min($50, 5%) = $50; Kashish's share is 50%.
  assert.equal(withLateFee(due, kashish, clock("2026-10-08"), { paid: true }).lateFeeUsd, 0);
  assert.equal(withLateFee(due, kashish, clock("2026-10-20"), { lateRoommates: 1 }).lateFeeUsd, 50); // alone: full cap
  assert.equal(withLateFee(due, kashish, clock("2026-10-20"), { lateRoommates: 2 }).lateFeeUsd, 25); // both late: $25 each
  assert.equal(withLateFee(due, kashish, clock("2026-10-08"), { lateRoommates: 2 }).lateFeeUsd, 15); // under the split cap anyway
});

test("T30: paying in sequence never exceeds the unit's legal cap (merge-check finding)", () => {
  const abhimanyu = { ...kashish, id: "abhimanyu", name: "Abhimanyu" };
  const dueFor = (id: string) => ({ ...due, tenantId: id });
  const unit = [{ tenant: abhimanyu, due: dueFor("abhimanyu") }, { tenant: kashish, due: dueFor("kashish") }];
  const day20 = clock("2026-10-20");
  // Both unpaid on day 20: $25 each.
  assert.equal(withLateFee(due, kashish, day20, lateFeeOpts(kashish, unit, [])).lateFeeUsd, 25);
  // Kashish paid $1,513 (incl. $25 fee); Abhimanyu pays later: still $25, unit total $50 (was $75 before).
  const afterKashish = [{ tenantId: "kashish", amountUsd: 1513 }];
  assert.deepEqual(lateFeeOpts(abhimanyu, unit, afterKashish), { paid: false, lateRoommates: 2, unitFeesPaidUsd: 25 });
  assert.equal(withLateFee(due, abhimanyu, day20, lateFeeOpts(abhimanyu, unit, afterKashish)).lateFeeUsd, 25);
  // Abhimanyu paid on time (no fee): Kashish is the only late roommate and can owe the full $50.
  const onTime = [{ tenantId: "abhimanyu", amountUsd: 1488 }];
  assert.equal(withLateFee(due, kashish, day20, lateFeeOpts(kashish, unit, onTime)).lateFeeUsd, 50);
  // A tenant who already paid owes nothing more.
  assert.equal(withLateFee(due, kashish, day20, lateFeeOpts(kashish, unit, afterKashish)).lateFeeUsd, 0);
});

test("paid only counts for this month AND this run (a reset makes it unpaid again)", () => {
  const paid: ActivityEntry = { id: "1", time: "t", run: 7, month: "2026-10", kind: "rent", tenantId: "kashish", title: "Rent", status: "paid",
    amountUsd: 1503, txHash: "ABC", explorerUrl: "https://testnet.xrpl.org/transactions/ABC" };
  assert.deepEqual(paymentFor([paid], "kashish", clock("2026-10-08")), { txHash: "ABC", explorerUrl: paid.explorerUrl, amountUsd: 1503, time: "t" });
  assert.equal(paymentFor([paid], "kashish", clock("2026-10-01", 8)), null); // after reset
  assert.equal(paymentFor([{ ...paid, status: "refused" }], "kashish", clock("2026-10-08")), null);
  assert.equal(paymentFor([paid], "abhimanyu", clock("2026-10-08")), null);
});
