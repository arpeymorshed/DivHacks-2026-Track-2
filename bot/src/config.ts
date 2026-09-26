// Reads and validates environment configuration. Values come from `.env`.

/**
 * Normalizes a phone number (or Apple ID email) so numbers written in
 * different styles compare equal: "+1 (555) 123-4567", "5551234567" and
 * "+15551234567" all become "+15551234567".
 */
export function normalizeAddress(raw: string): string {
  const value = raw.trim();
  if (value.includes("@")) return value.toLowerCase();
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

/** Last four digits only, for logs. */
export function maskAddress(address: string): string {
  return address.includes("@") ? "<email>" : `***${address.slice(-4)}`;
}

function parseTenantPhones(raw: string | undefined) {
  const tenantToPhone = new Map<string, string>();
  const phoneToTenant = new Map<string, string>();
  if (!raw?.trim()) throw new Error("TENANT_PHONES is empty. Expected \"tenantId:+1phone,tenantId:+1phone\".");

  for (const entry of raw.split(",")) {
    if (!entry.trim()) continue;
    const sep = entry.indexOf(":");
    const tenantId = entry.slice(0, sep).trim();
    const phone = entry.slice(sep + 1).trim();
    if (sep < 1 || !tenantId || !phone) {
      throw new Error(`TENANT_PHONES has a malformed entry (expected tenantId:+1phone): "${entry.trim().split(":")[0]}:…"`);
    }
    const address = normalizeAddress(phone);
    tenantToPhone.set(tenantId, address);
    phoneToTenant.set(address, tenantId);
  }
  return { tenantToPhone, phoneToTenant };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Add it to bot/.env (see .env.example).`);
  return value;
}

export function loadConfig() {
  const { tenantToPhone, phoneToTenant } = parseTenantPhones(process.env.TENANT_PHONES);
  return {
    projectId: requireEnv("PROJECT_ID"),
    projectSecret: requireEnv("PROJECT_SECRET"),
    apiBaseUrl: (process.env.API_BASE_URL || "http://localhost:4000").replace(/\/+$/, ""),
    tenantToPhone,
    phoneToTenant,
  };
}

export type Config = ReturnType<typeof loadConfig>;
