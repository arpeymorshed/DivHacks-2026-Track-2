// Browser client for the Aartee API (docs/MONEY-LAYER.md). One place for every call the UI makes,
// the demo-key header on state-changing routes (T18a), and the plain-English label for each
// Guardian / ledger rule. Types only from the server side: nothing here pulls in xrpl or MongoDB.
import type { RentDayResult, StateResponse } from "@/types/rent";
import { demoKeyHeaders } from "./demoKey";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

async function call<T>(path: string, init?: { method?: "GET" | "POST"; body?: unknown }): Promise<T> {
  const post = init?.method === "POST";
  const res = await fetch(path, {
    method: init?.method ?? "GET",
    headers: post ? demoKeyHeaders({ "content-type": "application/json" }) : undefined,
    body: post ? JSON.stringify(init?.body ?? {}) : undefined,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`, data.code);
  return data as T;
}

export type State = StateResponse;
export type Clock = StateResponse["clock"];
export type RentDayResponse = { success: boolean; clock: Clock; results: RentDayResult[] };
export type TopUpResponse = { success: boolean; txHash: string; explorer: string; usd: number; walletBalanceUsd: number; bankBalanceUsd: number };
export type AttackResponse = {
  success: boolean; live: boolean; title: string; blocked: boolean; blockedBy: "guardian" | "ledger" | null;
  rule: string; reason: string; ledgerCode?: string;
};
export type SpawnStep = { type: "step"; step: string; label: string; txHash?: string; explorer?: string; elapsedMs: number };
export type SpawnDone = { type: "done"; tenant: { id: string; name: string; walletAddress: string; agentAddress: string } };

export const api = {
  state: () => call<StateResponse>("/api/state"),
  rentDay: () => call<RentDayResponse>("/api/rent-day", { method: "POST" }),
  advanceDays: (days: number) => call<{ success: boolean; clock: Clock }>("/api/clock", { method: "POST", body: { advanceDays: days } }),
  // Decision (b), 2026-09-26: "jump to rent day" goes to the 1st of the current demo month.
  jumpToRentDay: (clock: Clock) => call<{ success: boolean; clock: Clock }>("/api/clock", { method: "POST", body: { jumpTo: `${clock.month}-01` } }),
  reset: () => call<{ success: boolean; state: { today: string; run: number } }>("/api/demo/reset", { method: "POST" }),
  topUp: (tenantId: string, usd: number) => call<TopUpResponse>("/api/topup", { method: "POST", body: { tenantId, usd } }),
  attack: (name: string, tenantId?: string) =>
    call<AttackResponse>(`/api/attacks/${encodeURIComponent(name)}`, { method: "POST", body: tenantId ? { tenantId } : {} }),
  chat: (tenantId: string, text: string) => call<{ reply: string }>("/api/chat", { method: "POST", body: { tenantId, text } }),

  // Live spawn (T35/T36): streams one JSON line per on-chain step, then "done" (or "error").
  async spawn(name: string, onStep: (s: SpawnStep) => void): Promise<SpawnDone["tenant"]> {
    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: demoKeyHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ name }),
    });
    if (!res.ok || !res.body) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new ApiError(res.status, data.error ?? `Spawn failed (${res.status})`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const msg = JSON.parse(line) as SpawnStep | SpawnDone | { type: "error"; error: string };
        if (msg.type === "step") onStep(msg);
        else if (msg.type === "done") return msg.tenant;
        else throw new ApiError(500, msg.error);
      }
      if (done) throw new ApiError(500, "Spawn stream ended without a result");
    }
  },
};

// The 5 attack cards (T38): server names, with the 3 shown in the 3-minute demo first.
export const ATTACK_CARDS = [
  { name: "scam-address", title: 'Scam text: "we changed our bank account"', live: true },
  { name: "illegal-late-fee", title: "Landlord agent charges a $200 late fee", live: true },
  { name: "stolen-key", title: "Attacker steals the agent's key", live: true },
  { name: "inflated-coned", title: "Inflated ConEd bill: $500 utilities", live: false },
  { name: "double-charge", title: "Rent charged twice in the same month", live: false },
] as const;

export type Tone = "ok" | "warn" | "bad";

// What to show for a rule (docs/MONEY-LAYER.md §6). On rent day "once-per-month" means the tenant
// already paid (good news); from an attack it's a blocked double charge.
export function ruleLabel(rule: string | undefined, context: "rent" | "attack"): { label: string; tone: Tone } {
  switch (rule) {
    case undefined:
    case "all":
      return { label: "Paid", tone: "ok" };
    case "once-per-month":
      return context === "rent" ? { label: "Already paid ✓", tone: "ok" } : { label: "Blocked: double charge", tone: "bad" };
    case "not-ready":
      return { label: "Run after rent day", tone: "warn" };
    case "insufficient-funds":
      return { label: "Short: top up first", tone: "warn" };
    case "landlord-only":
      return { label: "Blocked: scam address", tone: "bad" };
    case "legal-late-fee":
      return { label: "Blocked: illegal late fee", tone: "bad" };
    case "cap":
      return { label: "Blocked: overcharge", tone: "bad" };
    case "window":
      return { label: "Blocked: wrong date", tone: "bad" };
    case "intent-mismatch":
      return { label: "Blocked: agent lied", tone: "bad" };
    case "tx-shape":
      return { label: "Blocked: invalid payment", tone: "bad" };
    case "ledger-quorum":
      return { label: "Blocked by the ledger: stolen key", tone: "bad" };
    case "guardian-unreachable":
      return { label: "Guardian waking up: retry", tone: "warn" };
    default:
      return { label: "Couldn't complete: retry", tone: "warn" };
  }
}

export const usd = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
export const shortAddr = (a: string) => (a.length > 12 ? `${a.slice(0, 7)}…${a.slice(-4)}` : a);
export const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
