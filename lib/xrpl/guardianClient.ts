// App side of the Guardian: send the agent-signed blob, get a GuardianDecision back.
import type { CosignContext } from "../../guardian/rules";
import type { GuardianDecision, PaymentIntent } from "../types";

export type { CosignContext };

// Read when called, not at import: scripts load .env files after their imports have run.
const guardianUrl = () => process.env.GUARDIAN_URL ?? "http://localhost:4001";
// A sleeping free-plan Guardian takes ~50s to wake; fail fast (nothing is co-signed) instead of hanging a tick.
const timeoutMs = () => Number(process.env.GUARDIAN_TIMEOUT_MS ?? 10_000);

export async function requestCosign(txBlob: string, intent: PaymentIntent, context: CosignContext): Promise<GuardianDecision> {
  try {
    const res = await fetch(`${guardianUrl()}/cosign`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ txBlob, intent, context }),
      signal: AbortSignal.timeout(timeoutMs()),
    });
    return (await res.json()) as GuardianDecision;
  } catch (e) {
    const timedOut = (e as Error).name === "TimeoutError";
    return {
      approved: false,
      rule: "guardian-unreachable",
      reason: timedOut
        ? `Guardian did not answer within ${timeoutMs() / 1000}s (it may be waking up; open ${guardianUrl()}/health and retry).`
        : `Guardian did not answer: ${(e as Error).message}`,
    };
  }
}

// Clears the Guardian's cache of payments still settling. Not needed to replay a month: bump the run instead.
export async function resetGuardian(adminToken: string): Promise<void> {
  const res = await fetch(`${guardianUrl()}/reset`, {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}` },
    signal: AbortSignal.timeout(timeoutMs()),
  });
  if (!res.ok) throw new Error(`Guardian reset failed: ${res.status}`);
}
