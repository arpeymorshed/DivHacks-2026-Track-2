/**
 * Pure Polo chat reply logic — shared by the UI and unit tests.
 */

export type TenantChatState = {
  name: string;
  unit: string;
  bal: number;
  cap: number;
  rS: number;
  ut: number;
  lf: number;
  st: string;
  dl: number;
};

export type TopUpResult =
  | { ok: true; bal: number; added: number }
  | { ok: false; error: string; room: number };

export type ChatReply = { t: string; r: "a" | "err" };

export function f$(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function normalizeChatText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d]/g, "'")
    .replace(/[?.!,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function roomLeft(tn: TenantChatState): number {
  return Math.max(0, Math.round((tn.cap - tn.bal) * 100) / 100);
}

export function amountDue(tn: TenantChatState): number {
  return Math.round((tn.rS + tn.ut + tn.lf) * 100) / 100;
}

export function shortfall(tn: TenantChatState): number {
  return Math.max(0, Math.round((amountDue(tn) - tn.bal) * 100) / 100);
}

export function parseTopUpAmount(text: string): number | null {
  const q = normalizeChatText(text).replace(/,/g, "");
  // Never treat balance/status questions as top-ups.
  if (isWalletBalanceIntent(q) || isCapIntent(q) || isOweIntent(q) || isWhenDueIntent(q)) {
    return null;
  }
  const patterns = [
    /\b(?:top\s*up|add|deposit|fund|put)\b(?:\s+\w+){0,4}\s*\$?\s*(\d+(?:\.\d{1,2})?)/i,
    /\$\s*(\d+(?:\.\d{1,2})?)\s*(?:to\s+(?:my\s+)?wallet|into\s+(?:my\s+)?wallet)/i,
  ];
  for (const re of patterns) {
    const m = q.match(re);
    if (m) {
      const n = parseFloat(m[1]);
      if (Number.isFinite(n) && n > 0) return Math.round(n * 100) / 100;
    }
  }
  return null;
}

export function wantsTopUp(text: string): boolean {
  const q = normalizeChatText(text);
  if (isWalletBalanceIntent(q) || isCapIntent(q) || isOweIntent(q) || isWhenDueIntent(q)) {
    return false;
  }
  return (
    /\b(top\s*up|topup|deposit)\b/.test(q) ||
    /\bfund\b/.test(q) && /\b(wallet|account)\b/.test(q) ||
    /\badd\s+(?:money|funds|\$)/.test(q) ||
    /\bput\s+\$/.test(q) ||
    q.includes("add to my wallet") ||
    q.includes("add to wallet")
  );
}

export function isWalletBalanceIntent(text: string): boolean {
  const q = normalizeChatText(text);
  if (wantsTopUpRaw(q)) return false;
  // Bare "balance" / "wallet" (optionally with please/now/thanks) — not "balance due" etc.
  if (/^(my\s+)?(wallet(\s+balance)?|balance)(\s+(please|now|thanks|tho|though))?$/.test(q)) {
    return true;
  }
  return (
    (/\bwallet\b/.test(q) && /\b(balance|bal|have|got|hold|left|current)\b/.test(q)) ||
    /\b(my|current)\s+balance\b/.test(q) ||
    /\bwallet\s+balance\b/.test(q) ||
    /\bhow\s+much\s+(?:is\s+)?(?:in\s+)?(?:my\s+)?wallet\b/.test(q) ||
    /\bwhat(?:'s|s| is)\s+(?:my\s+)?(?:wallet\s+)?balance\b/.test(q) ||
    /\bshow\s+(?:me\s+)?(?:my\s+)?(?:wallet\s+)?balance\b/.test(q) ||
    /\b(check|see|get|give)\s+(?:me\s+)?(?:my\s+)?(?:wallet\s+)?balance\b/.test(q)
  );
}

function wantsTopUpRaw(q: string): boolean {
  return (
    /\b(top\s*up|topup|deposit)\b/.test(q) ||
    q.includes("add to my wallet") ||
    q.includes("add to wallet")
  );
}

export function isCapIntent(text: string): boolean {
  const q = normalizeChatText(text);
  return /\bcap\b/.test(q) || /\blimit\b/.test(q) || q.includes("how much can i add");
}

export function isWhenDueIntent(text: string): boolean {
  const q = normalizeChatText(text);
  return (
    /\bwhen\b/.test(q) ||
    q.includes("due date") ||
    q.includes("deadline") ||
    q.includes("by when") ||
    q.includes("what day") ||
    q.includes("which day") ||
    q.includes("rent day")
  );
}

export function isOweIntent(text: string): boolean {
  const q = normalizeChatText(text);
  if (isWalletBalanceIntent(q) || isCapIntent(q) || isWhenDueIntent(q)) return false;
  return (
    /\b(total|owe|owed|owing|due|short|amount|bill|fee|cost|charge|payment|rent|pay|paying|utilit)\b/.test(q) ||
    q.includes("how much") ||
    q.includes("what do i") ||
    q.includes("left to pay") ||
    q.includes("still need")
  );
}

export function applyTopUp(tn: TenantChatState, amount: number): TopUpResult {
  const room = roomLeft(tn);
  if (!(amount > 0)) {
    return { ok: false, error: "Enter an amount greater than $0 and try again.", room };
  }
  if (tn.bal + amount > tn.cap + 0.001) {
    return {
      ok: false,
      error: `That would put your wallet over the $${f$(tn.cap)} cap (balance $${f$(tn.bal)}). You can add up to $${f$(room)}. Please retry with a smaller amount.`,
      room,
    };
  }
  const next = Math.round((tn.bal + amount) * 100) / 100;
  return { ok: true, bal: next, added: amount };
}

export function replyWalletBalance(tn: TenantChatState): string {
  const room = roomLeft(tn);
  const short = shortfall(tn);
  const tip = short > 0 ? ` You're short $${f$(short)} toward this month's dues.` : "";
  return `Your rent wallet balance is $${f$(tn.bal)}. Cap $${f$(tn.cap)} — you can still add up to $${f$(room)}.${tip}`;
}

export function replyOwed(tn: TenantChatState, includeWhen = false): string {
  const tot = amountDue(tn);
  const parts = [`$${f$(tn.rS)} rent`, `$${f$(tn.ut)} ConEd`];
  if (tn.lf > 0) parts.push(`$${f$(tn.lf)} late fee`);
  const breakdown = `${parts.join(" + ")} = $${f$(tot)}`;
  const wallet = `Wallet balance $${f$(tn.bal)}.`;
  const short = shortfall(tn);
  const tip = short > 0 ? ` You're short $${f$(short)} — say “Top up $${f$(short)}” to cover it.` : "";

  if (includeWhen) {
    if (tn.st === "late") {
      return `You're ${tn.dl} days overdue. You owe ${breakdown}. ${wallet}${tip}`;
    }
    if (tn.st === "paid") {
      return `September is settled. Next payment of $${f$(tot)} is due Oct 1 (${breakdown}). ${wallet}`;
    }
    return `Your next payment of $${f$(tot)} is due Oct 1. Breakdown: ${breakdown}. ${wallet}${tip}`;
  }
  return `You currently owe ${breakdown}. ${wallet}${tip}`;
}

export function replyCap(tn: TenantChatState): string {
  const room = roomLeft(tn);
  return `Your wallet cap is $${f$(tn.cap)}. Balance $${f$(tn.bal)}, so you can still add up to $${f$(room)}.`;
}

export function buildPoloReply(
  text: string,
  tn: TenantChatState,
  onTopUp: (amount: number) => TopUpResult,
  canned?: Record<string, string>,
): ChatReply {
  if (canned) {
    const exact = canned[text];
    if (exact) return { t: exact, r: "a" };
  }

  const q = normalizeChatText(text);

  // 1) Wallet balance — before top-up / owe so "wallet balance" never becomes a top-up prompt
  if (isWalletBalanceIntent(text)) {
    return { t: replyWalletBalance(tn), r: "a" };
  }

  // 2) Cap / limit
  if (isCapIntent(text)) {
    return { t: replyCap(tn), r: "a" };
  }

  // 3) Top up
  if (wantsTopUp(text) || parseTopUpAmount(text) !== null) {
    const amt = parseTopUpAmount(text);
    const room = roomLeft(tn);
    if (amt === null) {
      return {
        t: room <= 0
          ? `Your wallet is at the $${f$(tn.cap)} cap (balance $${f$(tn.bal)}). You can't add more right now.`
          : `How much should I add? You can top up up to $${f$(room)} before hitting your $${f$(tn.cap)} cap. Try “Top up $100”.`,
        r: "a",
      };
    }
    const result = onTopUp(amt);
    if (result.ok === false) return { t: result.error, r: "err" };
    return {
      t: `Done — added $${f$(result.added)} to your rent wallet. New balance: $${f$(result.bal)} (cap $${f$(tn.cap)}).`,
      r: "a",
    };
  }

  // 4) When due / how much owed
  if (isWhenDueIntent(text)) {
    return { t: replyOwed(tn, true), r: "a" };
  }
  if (isOweIntent(text)) {
    return { t: replyOwed(tn, false), r: "a" };
  }

  // 5) Fuzzy canned
  if (canned) {
    const fuzzy = Object.keys(canned).find((k) => {
      const key = normalizeChatText(k);
      return q.includes(key) || key.includes(q);
    });
    if (fuzzy) return { t: canned[fuzzy], r: "a" };
  }

  return {
    t: "I can check your wallet balance, what you owe, when rent is due, or top up your wallet (e.g. “Top up $100”).",
    r: "a",
  };
}
