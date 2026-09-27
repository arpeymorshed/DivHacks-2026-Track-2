import type {
  Building,
  Tenant,
  TenantAgent,
  Due,
} from "../../types/rent";

export const building: Building = {
  id: "building-1",
  name: "RT Demo Building",
  landlordName: "Arpey",
  // Real XRPL Testnet addresses (scripts/setup-xrpl.ts). Addresses are public; keys come from env.
  landlordWallet: "rLD4K9gFjsGMwVormQmV8DBfGkJWfVVxZS",
  units: [
    {
      id: "unit-4b",
      name: "4B",
      tenantIds: ["abhimanyu", "kashish"],
    },
    {
      id: "unit-2a",
      name: "2A",
      tenantIds: ["musammat"],
    },
  ],
};

export const tenants: Tenant[] = [
  {
    id: "abhimanyu",
    name: "Abhimanyu",
    unitId: "unit-4b",
    share: 0.5,
    capUsd: 1600,
    walletAddress: "rpLaekX6YCi9r5Vc3VUyAwEtLyT1F5PifS", // on-ledger "maya" wallet
    agentId: "agent-abhimanyu",
    phoneNumber: process.env.DEMO_ABHIMANYU_PHONE ?? "",
  },
  {
    id: "kashish",
    name: "Kashish",
    unitId: "unit-4b",
    share: 0.5,
    capUsd: 1600,
    walletAddress: "rJddJZQpVm7UESBCWxZncVLQb8xK9GbZwy", // on-ledger "jordan" wallet
    agentId: "agent-kashish",
    phoneNumber: process.env.DEMO_KASHISH_PHONE ?? "",
  },
  {
    id: "musammat",
    name: "Musammat",
    unitId: "unit-2a",
    share: 1.0,
    capUsd: 1600, // must match the Guardian policy for this wallet (docs/MONEY-LAYER.md §3)
    walletAddress: "r9hSWg45gqatR6GT3YTm7PVNwb8FzfNAT4", // on-ledger "priya" wallet
    agentId: "agent-musammat",
    phoneNumber: process.env.DEMO_MUSAMMAT_PHONE ?? "",
  },
];

export const tenantAgents: TenantAgent[] = [
  {
    id: "agent-abhimanyu",
    tenantId: "abhimanyu",
    status: "active",
  },
  {
    id: "agent-kashish",
    tenantId: "kashish",
    status: "active",
  },
  {
    id: "agent-musammat",
    tenantId: "musammat",
    status: "active",
  },
];

export const dues: Due[] = [
  {
    tenantId: "abhimanyu",
    month: "2026-10",
    rentUsd: 1450,
    utilitiesUsd: 38,
    dueDate: "2026-10-01",
    daysLate: 0,
    lateFeeUsd: 0,
    reason: "October rent + ConEd share",
  },
  {
    tenantId: "kashish",
    month: "2026-10",
    rentUsd: 1450,
    utilitiesUsd: 38,
    dueDate: "2026-10-01",
    daysLate: 0,
    lateFeeUsd: 0,
    reason: "October rent + ConEd share",
  },
  {
    tenantId: "musammat",
    month: "2026-10",
    rentUsd: 1450, // Unit 2A is $1,450 at 100%; the Guardian enforces rent == share exactly
    utilitiesUsd: 38, // 2A's line on the fixture ConEd bill (fixtures/utility-bill-building.png)
    dueDate: "2026-10-01",
    daysLate: 0,
    lateFeeUsd: 0,
    reason: "October rent + ConEd share",
  },
];
