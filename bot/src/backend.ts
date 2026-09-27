// Thin client for the aartee. backend. The bot is only a delivery channel:
// all tenant logic (agents, wallets, XRPL) lives behind these two routes.

export type OutboxMessage = { id: string; tenantId: string; text: string };

const TIMEOUT_MS = 20_000;

async function request(url: string, init?: RequestInit, parseJson = true): Promise<unknown> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${new URL(url).pathname} returned HTTP ${res.status}`);
  return parseJson ? res.json() : undefined;
}

export function createBackend(baseUrl: string) {
  return {
    async chat(tenantId: string, text: string): Promise<string> {
      const body = await request(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantId, text }),
      });
      const reply = (body as { reply?: unknown } | null)?.reply;
      if (typeof reply !== "string" || !reply.trim()) throw new Error("POST /api/chat response had no reply text");
      return reply;
    },

    async outbox(): Promise<OutboxMessage[]> {
      const body = await request(`${baseUrl}/api/outbox`);
      if (!Array.isArray(body)) throw new Error("GET /api/outbox did not return an array");
      return body.filter(
        (m): m is OutboxMessage =>
          typeof m?.id === "string" && typeof m?.tenantId === "string" && typeof m?.text === "string" && m.text.trim() !== "",
      );
    },

    /** Tells the backend a message was delivered, so /api/outbox stops returning it. */
    async ack(id: string): Promise<void> {
      await request(`${baseUrl}/api/outbox/${encodeURIComponent(id)}/ack`, { method: "POST" }, false);
    },
  };
}

export type Backend = ReturnType<typeof createBackend>;
