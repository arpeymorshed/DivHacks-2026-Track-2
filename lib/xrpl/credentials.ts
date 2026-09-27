// On-chain agent identity (KYA, XLS-70 Credentials). The landlord issues each rent wallet a
// "RentRelayTenantAgent" credential; the wallet accepts it. The credential's URI carries the wallet's
// limits, so the Guardian can recognise a spawned wallet from the ledger alone (survives restarts).
import { type Client, convertHexToString, convertStringToHex, type CredentialAccept, type CredentialCreate, type Wallet } from "xrpl";
import { submitOrThrow } from "./client";

export const CREDENTIAL_TYPE = "RentRelayTenantAgent";
export const CREDENTIAL_TYPE_HEX = convertStringToHex(CREDENTIAL_TYPE);
const LSF_ACCEPTED = 0x00010000;
const URI_PREFIX = "data:application/json,";

// Same fields as the Guardian's WalletPolicy limits.
export type WalletLimits = { tenantId: string; capUsd: number; unitRentUsd: number; rentShareUsd: number; maxUtilitiesUsd: number };

export function encodeLimits(limits: WalletLimits): string {
  const uri = URI_PREFIX + JSON.stringify(limits);
  if (uri.length > 256) throw new Error("credential URI over 256 bytes");
  return convertStringToHex(uri);
}

export function decodeLimits(uriHex: string | undefined): WalletLimits | null {
  if (!uriHex) return null;
  const uri = convertHexToString(uriHex);
  if (!uri.startsWith(URI_PREFIX)) return null;
  try {
    return JSON.parse(uri.slice(URI_PREFIX.length)) as WalletLimits;
  } catch {
    return null;
  }
}

// Landlord issues the credential to `subject` (the rent wallet).
export async function issueAgentCredential(client: Client, landlord: Wallet, subject: string, limits: WalletLimits): Promise<string> {
  const tx: CredentialCreate = {
    TransactionType: "CredentialCreate",
    Account: landlord.address,
    Subject: subject,
    CredentialType: CREDENTIAL_TYPE_HEX,
    URI: encodeLimits(limits),
  };
  return submitOrThrow(client, tx, landlord);
}

// The rent wallet accepts it. Must be signed by the wallet's master key, before the master is disabled.
export async function acceptAgentCredential(client: Client, wallet: Wallet, issuer: string): Promise<string> {
  const tx: CredentialAccept = {
    TransactionType: "CredentialAccept",
    Account: wallet.address,
    Issuer: issuer,
    CredentialType: CREDENTIAL_TYPE_HEX,
  };
  return submitOrThrow(client, tx, wallet);
}

export type AgentCredential = { issuer: string; accepted: boolean; limits: WalletLimits | null };

// The RentRelayTenantAgent credential `issuer` gave `subject`, or null if there is none.
export async function getAgentCredential(client: Client, subject: string, issuer: string): Promise<AgentCredential | null> {
  const res = await client.request({ command: "account_objects", account: subject, type: "credential" });
  const cred = (res.result.account_objects as unknown as { Issuer: string; Subject: string; CredentialType: string; Flags: number; URI?: string }[])
    .find((o) => o.Issuer === issuer && o.Subject === subject && o.CredentialType === CREDENTIAL_TYPE_HEX);
  if (!cred) return null;
  return { issuer: cred.Issuer, accepted: (cred.Flags & LSF_ACCEPTED) !== 0, limits: decodeLimits(cred.URI) };
}
