// GET /api/state (T18): everything the console and tenant views need in one read-only call.
// Public by design (judges can open it): display names and public addresses only, never seeds.
import { cycleDay, GRACE_DAYS } from "../../guardian/rules";
import { withClient } from "../../lib/xrpl/client";
import { explorerAccount } from "../../lib/xrpl/config";
import { getBalances } from "../../lib/xrpl/payments";
import type { ActivityEntry, Due, DueStage, StateResponse, TenantState } from "../../types/rent";
import { listActivity, listPaidRent } from "./activityLog.ts";
import { clockOf, getDemoState, type DemoClock } from "./demoState.ts";
import { getBuilding, getDues, getTenantAgents, getTenants } from "./rentRepository.ts";
import { withLateFee } from "./xrplPayments.ts";
import { realPaymentsEnabled } from "./xrplConfig.ts";

export function stageOf(due: Due, clock: DemoClock, paid: boolean): DueStage {
  if (paid) return "paid";
  const day = cycleDay(clock.today, due.month); // the due date is day 1
  if (day < 1) return "upcoming";
  if (day === 1) return "due";
  if (day <= GRACE_DAYS) return "grace";
  return "late";
}

// This month's paid rent for the current run, from the activity log (fast; no ledger history scan).
export function paymentFor(activity: ActivityEntry[], tenantId: string, clock: DemoClock) {
  const e = activity.find((a) => a.kind === "rent" && a.status === "paid" && a.tenantId === tenantId && a.month === clock.month && a.run === clock.run);
  return e?.txHash ? { txHash: e.txHash, explorerUrl: e.explorerUrl ?? "", amountUsd: e.amountUsd ?? 0, time: e.time } : null;
}

export async function buildState(): Promise<StateResponse> {
  const clock = clockOf(await getDemoState());
  const [building, tenants, agents, dues, activity, paidRent] = await Promise.all([
    getBuilding(), getTenants(), getTenantAgents(), getDues(clock.month), listActivity(50), listPaidRent(clock.month, clock.run),
  ]);
  const warnings: string[] = [];
  const real = realPaymentsEnabled();

  // Balances straight from the ledger (one connection for all wallets).
  const balances = new Map<string, number>();
  const bankAddress = process.env.XRPL_BANK_ADDRESS;
  if (real) {
    try {
      const addresses = [building.landlordWallet, ...tenants.map((t) => t.walletAddress), ...(bankAddress ? [bankAddress] : [])];
      await withClient(async (client) => {
        const results = await Promise.all(addresses.map((a) => getBalances(client, a).then((b) => [a, b.usd] as const)));
        for (const [a, usd] of results) balances.set(a, usd);
      });
    } catch (error) {
      warnings.push("Balances unavailable: the XRP Ledger didn't answer. Everything else is current.");
      console.error("State balances failed:", error instanceof Error ? error.name : "UnknownError");
    }
  }

  const tenantStates: TenantState[] = tenants.map((t) => {
    const agent = agents.find((a) => a.tenantId === t.id);
    const due = dues.find((d) => d.tenantId === t.id);
    let dueState: TenantState["due"] = null;
    if (due) {
      const payment = paymentFor(paidRent, t.id, clock);
      const today = payment ? due : withLateFee(due, t, clock); // a paid due keeps what was paid
      const total = payment ? payment.amountUsd : today.rentUsd + today.utilitiesUsd + today.lateFeeUsd;
      dueState = {
        month: due.month, dueDate: due.dueDate, rentUsd: due.rentUsd, utilitiesUsd: due.utilitiesUsd,
        lateFeeUsd: payment ? Math.max(0, total - due.rentUsd - due.utilitiesUsd) : today.lateFeeUsd,
        daysLate: today.daysLate, totalUsd: total, stage: stageOf(due, clock, Boolean(payment)), payment,
      };
    }
    return {
      id: t.id, name: t.name, unitId: t.unitId, share: t.share, capUsd: t.capUsd,
      walletAddress: t.walletAddress, walletExplorerUrl: explorerAccount(t.walletAddress),
      agent: { id: agent?.id ?? t.agentId, status: agent?.status ?? "error", credential: agent?.credentialId ?? null },
      balanceUsd: balances.get(t.walletAddress) ?? null,
      due: dueState,
    };
  });

  return {
    clock,
    paymentsMode: real ? "real" : "mock",
    building: {
      id: building.id, name: building.name, landlordName: building.landlordName, landlordWallet: building.landlordWallet,
      landlordExplorerUrl: explorerAccount(building.landlordWallet), landlordBalanceUsd: balances.get(building.landlordWallet) ?? null,
      units: building.units,
    },
    bankBalanceUsd: bankAddress ? balances.get(bankAddress) ?? null : null,
    tenants: tenantStates,
    activity,
    warnings,
  };
}
