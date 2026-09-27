/**
 * Shared chat intent helpers for rent Q&A (web + Photon /api/chat).
 * Money questions always resolve to a dollar amount when due data exists.
 */

export function normalizeChatText(text: string): string {
  return text.toLowerCase().replace(/[?.!,]/g, " ").replace(/\s+/g, " ").trim();
}

/** User is asking about amounts they owe / their rent wallet. */
export function isMoneyIntent(message: string): boolean {
  const q = normalizeChatText(message);
  if (
    q.includes("how much") ||
    q.includes("what do i") ||
    q.includes("whats my") ||
    q.includes("what is my") ||
    q.includes("what's my") ||
    q.includes("show me") ||
    q.includes("tell me")
  ) {
    if (
      /\b(owe|owed|owing|due|rent|total|balance|wallet|bill|fee|pay|payment|cost|charge|utilit)/.test(q) ||
      q.includes("how much")
    ) {
      return true;
    }
  }
  return (
    /\b(total|owe|owed|owing|due|balance|wallet|short|amount|bill|fee|cost|charge|payment|utilit)\b/.test(q) ||
    /\b(rent|pay|paying)\b/.test(q) ||
    q.includes("how much") ||
    q.includes("left to pay") ||
    q.includes("still need")
  );
}

/** User is asking when payment is due (still should include $). */
export function asksWhenDue(message: string): boolean {
  const q = normalizeChatText(message);
  return (
    /\bwhen\b/.test(q) ||
    q.includes("due date") ||
    q.includes("deadline") ||
    q.includes("by when") ||
    q.includes("what day") ||
    q.includes("which day")
  );
}

export function formatMoneyReply(opts: {
  name: string;
  rentUsd: number;
  utilitiesUsd: number;
  lateFeeUsd: number;
  dueDate?: string;
  includeWhen?: boolean;
}): string {
  const total = opts.rentUsd + opts.utilitiesUsd + opts.lateFeeUsd;
  let breakdown = `$${opts.rentUsd} rent + $${opts.utilitiesUsd} utilities`;
  if (opts.lateFeeUsd > 0) breakdown += ` + $${opts.lateFeeUsd} late fee`;
  breakdown += ` = $${total}`;

  if (opts.includeWhen && opts.dueDate) {
    return `Your next payment of $${total} is due ${opts.dueDate}. Breakdown: ${breakdown}.`;
  }
  if (opts.includeWhen) {
    return `You currently owe $${total} (${breakdown}).`;
  }
  return `You currently owe $${total}: ${breakdown}.`;
}
