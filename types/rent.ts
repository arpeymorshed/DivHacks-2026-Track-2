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

export type ChatRequest = {
  tenantId: string;
  text: string;
};

export type ChatResponse = {
  reply: string;
};

export type OutboxMessage = {
  id: string;
  tenantId: string;
  text: string;
  status: "pending" | "sent";
  dedupeKey: string;
  createdAt: Date;
  sentAt?: Date;
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
  rule?: string; // real Guardian only: which rule decided (e.g. "once-per-month"); see docs/MONEY-LAYER.md §6
};

export type MockPaymentResult = {
  success: true;
  status: "mock-paid";
  tenantId: string;
  amountUsd: number;
  destination: string;
  txHash: string;
};

// A real XRPL Testnet payment (src/services/xrplPayments.ts).
export type LedgerPaymentResult = {
  success: boolean; // true only when the ledger result is tesSUCCESS
  status: "paid" | "failed";
  tenantId: string;
  amountUsd: number;
  destination: string;
  txHash: string;
  ledgerCode: string; // e.g. "tesSUCCESS"
  explorerUrl: string; // testnet.xrpl.org link
  period: string; // "2026-10#run3": the on-ledger month/run tag
};

export type RentDayResult = {
  tenantId: string;
  intent: PaymentIntent;
  guardianDecision: GuardianDecision;
  payment: MockPaymentResult | LedgerPaymentResult | null;
};

// Demo clock + run, stored in MongoDB (collection "demoState"). Reset bumps `run`.
export type DemoState = {
  id: "demo";
  today: string; // "2026-10-01"
  run: number;
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
