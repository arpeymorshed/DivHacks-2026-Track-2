// Shared data formats (PLAN.md, T00). Change only via P2.
export type Unit = { id: string; label: string; rentUsd: number };
export type Tenant = { id: string; unitId: string; name: string; sharePct: number; capUsd: number;
                walletAddress: string; agentId: string; channel: "imessage" | "web"; phone?: string };
export type TenantAgent = { id: string; tenantId: string; credential: "none" | "issued" | "accepted";
                     status: "spawning" | "active" };
export type Due = { id: string; tenantId: string; month: string; dueDate: string; rentUsd: number;
             utilitiesUsd: number; daysLate: number; lateFeeUsd: number; payLaterUntil?: string;
             status: "upcoming" | "due" | "grace" | "late" | "paid"; reason: string };
export type Message = { id: string; tenantId: string; from: "agent" | "tenant"; text: string; time: string };
export type PaymentIntent = { tenantId: string; dueId: string; destination: string; rentUsd: number;
                       utilitiesUsd: number; lateFeeUsd: number; totalUsd: number; reason: string };
export type GuardianDecision = { approved: boolean; rule: string; reason: string; signature?: string };
export type AuditEntry = { id: string; time: string; intent: PaymentIntent; decision: GuardianDecision;
                    txHash?: string; memoHash: string; status: "paid" | "blocked" | "failed" };
