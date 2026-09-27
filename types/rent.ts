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
  payLaterUntil?: string;
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

// ── Activity log + GET /api/state (T18) ──────────────────────────────────────────────────────────
// Everything the demo does that touches money, recorded in MongoDB (collection "activity") so the
// console can show a real audit trail with explorer links and Guardian reasons.
export type ActivityEntry = {
  id: string;
  time: string; // ISO
  run: number;
  month: string; // "2026-10"
  kind: "rent" | "attack" | "topup" | "spawn" | "reset";
  tenantId?: string;
  title: string; // short, human: "Rent $1,488", "Scam bank-account change"
  status: "paid" | "blocked" | "refused" | "failed" | "done";
  amountUsd?: number;
  rule?: string; // Guardian/ledger rule, e.g. "landlord-only", "once-per-month", "ledger-quorum"
  reason?: string; // plain-English reason, safe to display
  blockedBy?: "guardian" | "ledger";
  txHash?: string;
  explorerUrl?: string;
};

export type DueStage = "upcoming" | "due" | "grace" | "late" | "paid";

export type TenantState = {
  id: string;
  name: string; // display name
  unitId: string;
  share: number;
  capUsd: number;
  walletAddress: string;
  walletExplorerUrl: string;
  agent: { id: string; status: TenantAgent["status"]; credential: string | null };
  balanceUsd: number | null; // null when the ledger isn't reachable / mock mode
  due: {
    month: string;
    dueDate: string;
    rentUsd: number;
    utilitiesUsd: number;
    lateFeeUsd: number; // what the Guardian would accept today
    daysLate: number;
    totalUsd: number;
    stage: DueStage;
    payment: { txHash: string; explorerUrl: string; amountUsd: number; time: string } | null;
  } | null;
};

export type StateResponse = {
  clock: { today: string; month: string; run: number };
  paymentsMode: "real" | "mock";
  building: {
    id: string;
    name: string;
    landlordName: string;
    landlordWallet: string;
    landlordExplorerUrl: string;
    landlordBalanceUsd: number | null;
    units: Unit[];
  };
  bankBalanceUsd: number | null;
  tenants: TenantState[];
  activity: ActivityEntry[]; // newest first
  warnings: string[];
};
