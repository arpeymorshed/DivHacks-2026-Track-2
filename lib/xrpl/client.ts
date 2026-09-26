import { Client, type SubmittableTransaction, type Wallet } from "xrpl";
import { XRPL_WS } from "./config";

// Opens a Testnet connection for the duration of `fn`, then always closes it.
export async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client(XRPL_WS);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.disconnect();
  }
}

// Single-signs, submits and waits for validation. Throws unless the result is tesSUCCESS.
export async function submitOrThrow(client: Client, tx: SubmittableTransaction, wallet: Wallet): Promise<string> {
  const res = await client.submitAndWait(tx, { wallet, autofill: true });
  const code = (res.result.meta as { TransactionResult?: string } | undefined)?.TransactionResult;
  if (code !== "tesSUCCESS") throw new Error(`${tx.TransactionType} from ${tx.Account} failed: ${code}`);
  return res.result.hash;
}
