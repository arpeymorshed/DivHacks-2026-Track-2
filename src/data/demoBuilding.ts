import type {
  Building,
  Tenant,
  TenantAgent,
  Due,
} from "../../types/rent";

export const building: Building = {
  id: "building-1",
  name: "RentRelay Demo Building",
  landlordName: "Arpey",
  landlordWallet: "rLANDLORD_DEMO",
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
    walletAddress: "rABHIMANYU_DEMO",
    agentId: "agent-abhimanyu",
    phoneNumber: process.env.DEMO_ABHIMANYU_PHONE ?? "",
  },
  {
    id: "kashish",
    name: "Kashish",
    unitId: "unit-4b",
    share: 0.5,
    capUsd: 1600,
    walletAddress: "rKASHISH_DEMO",
    agentId: "agent-kashish",
    phoneNumber: process.env.DEMO_KASHISH_PHONE ?? "",
  },
  {
    id: "musammat",
    name: "Musammat",
    unitId: "unit-2a",
    share: 1.0,
    capUsd: 2200,
    walletAddress: "rMUSAMMAT_DEMO",
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
    rentUsd: 1900,
    utilitiesUsd: 52,
    dueDate: "2026-10-01",
    daysLate: 0,
    lateFeeUsd: 0,
    reason: "October rent + ConEd share",
  },
];
