// Fallback for GET /api/state when Mongo isn't configured (local preview without Atlas).
// Built from the same demoBuilding seed the real seed route uses — UI-complete, mock balances.
import { explorerAccount } from "../../lib/xrpl/config.ts";
import { building, dues, tenantAgents, tenants } from "../data/demoBuilding.ts";
import type { StateResponse, TenantState } from "../../types/rent";
import { DEFAULT_DEMO_STATE, clockOf } from "./demoState.ts";

/** Demo wallet balances so the tenant shell shows dues + shortfall without a ledger. */
const DEMO_BALANCES: Record<string, number> = {
  abhimanyu: 420,
  kashish: 1488,
  musammat: 200,
};

export function buildOfflineState(): StateResponse {
  const clock = clockOf(DEFAULT_DEMO_STATE);
  const tenantStates: TenantState[] = tenants.map((t) => {
    const agent = tenantAgents.find((a) => a.tenantId === t.id);
    const due = dues.find((d) => d.tenantId === t.id && d.month === clock.month);
    const balanceUsd = DEMO_BALANCES[t.id] ?? 0;
    return {
      id: t.id,
      name: t.name,
      unitId: t.unitId,
      share: t.share,
      capUsd: t.capUsd,
      walletAddress: t.walletAddress,
      walletExplorerUrl: explorerAccount(t.walletAddress),
      agent: {
        id: agent?.id ?? t.agentId,
        status: agent?.status ?? "active",
        credential: agent?.credentialId ?? null,
      },
      balanceUsd,
      due: due
        ? {
            month: due.month,
            dueDate: due.dueDate,
            rentUsd: due.rentUsd,
            utilitiesUsd: due.utilitiesUsd,
            lateFeeUsd: due.lateFeeUsd,
            daysLate: due.daysLate,
            totalUsd: due.rentUsd + due.utilitiesUsd + due.lateFeeUsd,
            stage: "due" as const,
            payment: null,
          }
        : null,
    };
  });

  return {
    clock,
    paymentsMode: "mock",
    building: {
      id: building.id,
      name: building.name,
      landlordName: building.landlordName,
      landlordWallet: building.landlordWallet,
      landlordExplorerUrl: explorerAccount(building.landlordWallet),
      landlordBalanceUsd: 0,
      units: building.units,
    },
    bankBalanceUsd: null,
    tenants: tenantStates,
    activity: [],
    warnings: [
      "Offline demo mode: MongoDB isn't configured. Showing seed building data so you can browse the UI. Top-up, rent day, and seed need MONGODB_URI.",
    ],
  };
}
