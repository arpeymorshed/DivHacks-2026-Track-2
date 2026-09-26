export type Tenant = {
  id: string;
  name: string;
  unitId: string;
  share: number;        // e.g. 0.5 for 50%
  capUsd: number;       // max amount tenant allows
  walletAddress: string;
  agentId: string;
  phoneNumber: string; // E.164; empty when not configured
};

export type PhotonMessage = {
  from: string; // E.164 sender phone number
  message: string;
};

export type Unit = {
  id: string;
  name: string;         // e.g. "4B"
  tenantIds: string[];
};

export type Building = {
  id: string;
  name: string;
  landlordName: string;
  landlordWallet: string;
  units: Unit[];
};

export type TenantAgent = {
  id: string;
  tenantId: string;
  status: "active" | "paused" | "error";
  credentialId?: string;
};

export type Due = {
  tenantId: string;
  month: string;        // e.g. "2026-10"
  rentUsd: number;
  utilitiesUsd: number;
  dueDate: string;
  daysLate: number;
  lateFeeUsd: number;
  reason: string;
};

export type PaymentIntent = {
  tenantId: string;
  agentId: string;
  destination: string;
  amountUsd: number;
  currency: "RLUSD";
  month: string;
  reason: string;
};

export type GuardianDecision = {
  approved: boolean;
  reason: string;
};

export type MockPaymentResult = {
  success: true;
  status: "mock-paid";
  tenantId: string;
  amountUsd: number;
  destination: string;
  txHash: string;
};

export type RentDayResult = {
  tenantId: string;
  intent: PaymentIntent;
  guardianDecision: GuardianDecision;
  payment: MockPaymentResult | null;
};

export type AuditEntry = {
  id: string;
  event:
    | "RENT_DAY_STARTED"
    | "PAYMENT_PROPOSED"
    | "GUARDIAN_APPROVED"
    | "GUARDIAN_REJECTED"
    | "PAYMENT_SUBMITTED"
    | "PAYMENT_CONFIRMED";
  tenantId?: string;
  details?: Record<string, unknown>;
  timestamp: string;
};
