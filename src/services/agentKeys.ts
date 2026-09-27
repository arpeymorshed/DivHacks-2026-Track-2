// Tenant agents' signing keys. Seed tenants: from env (xrplConfig). Spawned tenants (T35): stored in
// MongoDB encrypted with AES-256-GCM under AGENT_KEY_SECRET (env), never in plain text.
// Only agent keys live here: never the Guardian's seed, never a tenant's backup seed.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getDb } from "../lib/mongodb.ts";
import { agentSeedEnvFor, envSeed } from "./xrplConfig.ts";

type StoredAgentKey = { tenantId: string; agentAddress: string; iv: string; tag: string; data: string };

function key(): Buffer {
  return createHash("sha256").update(envSeed("AGENT_KEY_SECRET")).digest();
}

export async function saveAgentSeed(tenantId: string, agentAddress: string, seed: string): Promise<void> {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(seed, "utf8"), cipher.final()]);
  const doc: StoredAgentKey = { tenantId, agentAddress, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") };
  await (await getDb()).collection<StoredAgentKey>("agentKeys").updateOne({ tenantId }, { $set: doc }, { upsert: true });
}

export async function getAgentSeed(tenantId: string): Promise<string> {
  const envName = agentSeedEnvFor(tenantId);
  if (envName) return envSeed(envName);
  const doc = await (await getDb()).collection<StoredAgentKey>("agentKeys").findOne({ tenantId });
  if (!doc) throw new Error(`No agent key for tenant ${tenantId}`);
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(doc.iv, "base64"));
  decipher.setAuthTag(Buffer.from(doc.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(doc.data, "base64")), decipher.final()]).toString("utf8");
}
