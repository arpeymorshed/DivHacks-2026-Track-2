// Two-key rent wallets: master key disabled, signer list agent(1) + Guardian(1) + tenant backup(2),
// quorum 2. The agent can only pay with the Guardian's co-signature; the tenant alone can always withdraw.
import { type AccountSet, AccountSetAsfFlags, LedgerEntry, type Client, type SignerListSet, type Wallet } from "xrpl";
import { submitOrThrow } from "./client";

export const SIGNER_QUORUM = 2;

export type RentWalletSigners = { agent: string; guardian: string; backup: string };
export type SignerEntry = { account: string; weight: number };
export type RentWalletStatus = { masterDisabled: boolean; quorum: number | null; signers: SignerEntry[] };

export function expectedSigners(s: RentWalletSigners): SignerEntry[] {
  return [
    { account: s.agent, weight: 1 },
    { account: s.guardian, weight: 1 },
    { account: s.backup, weight: 2 },
  ];
}

export async function getRentWalletStatus(client: Client, address: string): Promise<RentWalletStatus> {
  const res = await client.request({ command: "account_info", account: address, signer_lists: true });
  // API v2 puts signer_lists on the result; v1 put it inside account_data.
  const r = res.result as unknown as {
    account_data: { Flags: number; signer_lists?: unknown[] };
    signer_lists?: unknown[];
  };
  const list = (r.signer_lists ?? r.account_data.signer_lists ?? [])[0] as
    | { SignerQuorum: number; SignerEntries: { SignerEntry: { Account: string; SignerWeight: number } }[] }
    | undefined;
  return {
    masterDisabled: (r.account_data.Flags & LedgerEntry.AccountRootFlags.lsfDisableMaster) !== 0,
    quorum: list?.SignerQuorum ?? null,
    signers: (list?.SignerEntries ?? []).map((e) => ({ account: e.SignerEntry.Account, weight: e.SignerEntry.SignerWeight })),
  };
}

function signersMatch(status: RentWalletStatus, expected: SignerEntry[]): boolean {
  const key = (l: SignerEntry[]) => l.map((e) => `${e.account}:${e.weight}`).sort().join(",");
  return status.quorum === SIGNER_QUORUM && key(status.signers) === key(expected);
}

// Turns a funded account into a two-key rent wallet. Idempotent; returns the hashes of any txs sent.
// `master` must still be able to sign, so run this before anything else disables the master key.
export async function makeRentWallet(client: Client, master: Wallet, signers: RentWalletSigners): Promise<string[]> {
  const expected = expectedSigners(signers);
  const status = await getRentWalletStatus(client, master.address);
  const hashes: string[] = [];

  if (!signersMatch(status, expected)) {
    if (status.masterDisabled) {
      throw new Error(`${master.address}: master disabled but signer list is wrong; fix it with a multisigned SignerListSet`);
    }
    const tx: SignerListSet = {
      TransactionType: "SignerListSet",
      Account: master.address,
      SignerQuorum: SIGNER_QUORUM,
      SignerEntries: expected.map((e) => ({ SignerEntry: { Account: e.account, SignerWeight: e.weight } })),
    };
    hashes.push(await submitOrThrow(client, tx, master));
  }

  if (!status.masterDisabled) {
    const tx: AccountSet = { TransactionType: "AccountSet", Account: master.address, SetFlag: AccountSetAsfFlags.asfDisableMaster };
    hashes.push(await submitOrThrow(client, tx, master));
  }
  return hashes;
}
