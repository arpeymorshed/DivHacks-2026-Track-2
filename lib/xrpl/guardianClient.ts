// App side of the Guardian: send the agent-signed blob, get a GuardianDecision back.
import type { GuardianDecision, PaymentIntent } from "../types";

const GUARDIAN_URL = process.env.GUARDIAN_URL ?? "http://localhost:4001";

export type CosignContext = { today: string; month: string }; // demo-clock date, "YYYY-MM-DD" / "YYYY-MM"

export async function requestCosign(txBlob: string, intent: PaymentIntent, context: CosignContext): Promise<GuardianDecision> {
  try {
    const res = await fetch(`${GUARDIAN_URL}/cosign`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ txBlob, intent, context }),
    });
    return (await res.json()) as GuardianDecision;
  } catch (e) {
    return { approved: false, rule: "guardian-unreachable", reason: `Guardian did not answer: ${(e as Error).message}` };
  }
}

export async function resetGuardian(adminToken: string): Promise<void> {
  const res = await fetch(`${GUARDIAN_URL}/reset`, { method: "POST", headers: { authorization: `Bearer ${adminToken}` } });
  if (!res.ok) throw new Error(`Guardian reset failed: ${res.status}`);
}
