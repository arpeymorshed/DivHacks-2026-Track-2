// Offline checks for GET /api/state's derived fields (stage + paid detection). Run: npm run test:state
import assert from "node:assert/strict";
import { test } from "node:test";
import type { ActivityEntry, Due } from "../../types/rent";
import { paymentFor, stageOf } from "./stateService.ts";
import { withLateFee } from "./lateFee.ts";

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

test("paid only counts for this month AND this run (a reset makes it unpaid again)", () => {
  const paid: ActivityEntry = { id: "1", time: "t", run: 7, month: "2026-10", kind: "rent", tenantId: "kashish", title: "Rent", status: "paid",
    amountUsd: 1503, txHash: "ABC", explorerUrl: "https://testnet.xrpl.org/transactions/ABC" };
  assert.deepEqual(paymentFor([paid], "kashish", clock("2026-10-08")), { txHash: "ABC", explorerUrl: paid.explorerUrl, amountUsd: 1503, time: "t" });
  assert.equal(paymentFor([paid], "kashish", clock("2026-10-01", 8)), null); // after reset
  assert.equal(paymentFor([{ ...paid, status: "refused" }], "kashish", clock("2026-10-08")), null);
  assert.equal(paymentFor([paid], "abhimanyu", clock("2026-10-08")), null);
});
