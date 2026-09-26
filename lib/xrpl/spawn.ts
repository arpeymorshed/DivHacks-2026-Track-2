// T35 (P1 half): the landlord's main agent spawns a tenant agent's rent wallet, live.
//   1. ops account funds a brand-new wallet with XRP reserves
//   2. RLUSD trust line            ┐ in parallel (different accounts)
//   3. landlord issues credential  ┘  (KYA: "RentRelayTenantAgent", limits in the URI)
//   4. wallet accepts the credential
//   5. signer list: agent(1) + Guardian(1) + tenant backup(2), quorum 2
//   6. master key disabled
// The Guardian then recognises the wallet from the ledger (credential + signer list); no registration step.
// P2's POST /api/tenants calls this and streams `onStep` events to the console (T36 animation).
import { type Client, type Payment, Wallet, xrpToDrops } from "xrpl";
import { submitOrThrow } from "./client";
import { explorerTx } from "./config";
import { acceptAgentCredential, issueAgentCredential, type WalletLimits } from "./credentials";
import { makeRentWallet } from "./rentWallet";
import { ensureRlusdTrustLine } from "./rlusd";

export type SpawnStepName = "keys" | "fund" | "trustline" | "credential-issued" | "credential-accepted" | "signer-list" | "master-disabled";
export type SpawnStep = { step: SpawnStepName; label: string; txHash?: string; explorer?: string; elapsedMs: number };

export type SpawnArgs = {
  ops: Wallet; // pays the new wallet's XRP reserves
  landlord: Wallet; // issues the credential
  guardianAddress: string;
  limits: WalletLimits;
  onStep?: (s: SpawnStep) => void;
};

// Seeds are returned once: the app stores agentSeed (encrypted) for the tenant agent; backupSeed goes to the
// tenant only and must not be stored by the app. The wallet's own master seed is discarded (key disabled).
export type SpawnResult = { address: string; agentAddress: string; agentSeed: string; backupAddress: string; backupSeed: string; steps: SpawnStep[] };

// Owned objects: trust line, signer list, credential.
const OWNED_OBJECTS = 3;
const FEE_BUFFER_XRP = 1;

export async function spawnRentWallet(client: Client, { ops, landlord, guardianAddress, limits, onStep }: SpawnArgs): Promise<SpawnResult> {
  const t0 = Date.now();
  const steps: SpawnStep[] = [];
  const emit = (step: SpawnStepName, label: string, txHash?: string) => {
    const s: SpawnStep = { step, label, txHash, explorer: txHash ? explorerTx(txHash) : undefined, elapsedMs: Date.now() - t0 };
    steps.push(s);
    onStep?.(s);
  };

  const wallet = Wallet.generate();
  const agent = Wallet.generate();
  const backup = Wallet.generate();
  emit("keys", `New rent wallet ${wallet.address}, agent key ${agent.address}`);

  const info = await client.request({ command: "server_info" });
  const ledger = info.result.info.validated_ledger!;
  const fundXrp = ledger.reserve_base_xrp + OWNED_OBJECTS * ledger.reserve_inc_xrp + FEE_BUFFER_XRP;
  const fund: Payment = { TransactionType: "Payment", Account: ops.address, Destination: wallet.address, Amount: xrpToDrops(fundXrp) };
  emit("fund", `Main agent funded the wallet with ${fundXrp} XRP`, await submitOrThrow(client, fund, ops));

  await Promise.all([
    ensureRlusdTrustLine(client, wallet).then((h) => emit("trustline", "RLUSD trust line set", h ?? undefined)),
    issueAgentCredential(client, landlord, wallet.address, limits).then((h) => emit("credential-issued", "Landlord issued the agent credential", h)),
  ]);

  emit("credential-accepted", "Agent accepted its credential", await acceptAgentCredential(client, wallet, landlord.address));

  await makeRentWallet(client, wallet, { agent: agent.address, guardian: guardianAddress, backup: backup.address }, (step, hash) =>
    emit(step, step === "signer-list" ? "Two-key rule set: agent + Guardian (tenant backup can always withdraw)" : "Master key disabled", hash),
  );

  return { address: wallet.address, agentAddress: agent.address, agentSeed: agent.seed!, backupAddress: backup.address, backupSeed: backup.seed!, steps };
}
