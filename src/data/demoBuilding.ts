import type {
  Building,
  Tenant,
  TenantAgent,
  Due,
} from "../../types/rent";

export const building: Building = {
  id: "building-1",
  name: "RentRelay Demo Building",
  landlordWallet: "rLANDLORD_DEMO",
  units: [
    {
      id: "unit-4b",
      name: "4B",
      tenantIds: ["maya", "jordan"],
    },
    {
      id: "unit-2a",
      name: "2A",
      tenantIds: ["priya"],
    },
  ],
};

export const tenants: Tenant[] = [
  {
    id: "maya",
    name: "Maya",
    unitId: "unit-4b",
    share: 0.5,
    capUsd: 1600,
    walletAddress: "rMAYA_DEMO",
    agentId: "agent-maya",
  },
  {
    id: "jordan",
    name: "Jordan",
    unitId: "unit-4b",
    share: 0.5,
    capUsd: 1600,
    walletAddress: "rJORDAN_DEMO",
    agentId: "agent-jordan",
  },
  {
    id: "priya",
    name: "Priya",
    unitId: "unit-2a",
    share: 1.0,
    capUsd: 2200,
    walletAddress: "rPRIYA_DEMO",
    agentId: "agent-priya",
  },
];

export const tenantAgents: TenantAgent[] = [
  {
    id: "agent-maya",
    tenantId: "maya",
    status: "active",
  },
  {
    id: "agent-jordan",
    tenantId: "jordan",
    status: "active",
  },
  {
    id: "agent-priya",
    tenantId: "priya",
    status: "active",
  },
];

export const dues: Due[] = [
  {
    tenantId: "maya",
    month: "2026-10",
    rentUsd: 1450,
    utilitiesUsd: 38,
    dueDate: "2026-10-01",
    daysLate: 0,
    lateFeeUsd: 0,
    reason: "October rent + ConEd share",
  },
  {
    tenantId: "jordan",
    month: "2026-10",
    rentUsd: 1450,
    utilitiesUsd: 38,
    dueDate: "2026-10-01",
    daysLate: 0,
    lateFeeUsd: 0,
    reason: "October rent + ConEd share",
  },
  {
    tenantId: "priya",
    month: "2026-10",
    rentUsd: 1900,
    utilitiesUsd: 52,
    dueDate: "2026-10-01",
    daysLate: 0,
    lateFeeUsd: 0,
    reason: "October rent + ConEd share",
  },
];
