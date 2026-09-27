/**
 * Shared chat intent helpers for rent Q&A (web + Photon /api/chat).
 * Money questions always resolve to a dollar amount when due data exists.
 */

import {
  isCapIntent,
  isOweIntent,
  isWalletBalanceIntent,
  isWhenDueIntent,
  normalizeChatText,
} from "./poloChat.ts";

export {
  isCapIntent,
  isOweIntent,
  isWalletBalanceIntent,
  isWhenDueIntent,
  normalizeChatText,
};

/** @deprecated Prefer isOweIntent / isWalletBalanceIntent. Kept for callers that mean "any money topic". */
export function isMoneyIntent(message: string): boolean {
  if (isWalletBalanceIntent(message) || isOweIntent(message) || isCapIntent(message)) {
    return true;
  }
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
  return isWhenDueIntent(message);
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

export function formatWalletBalanceReply(opts: {
  name: string;
  balanceUsd: number | null;
  capUsd: number;
  dueTotalUsd?: number;
}): string {
  if (opts.balanceUsd == null) {
    return (
      `I can't read ${opts.name}'s on-chain wallet balance right now. `
      + `Your wallet cap is $${opts.capUsd}. Open Polo in the app for the live demo balance.`
    );
  }
  const room = Math.max(0, Math.round((opts.capUsd - opts.balanceUsd) * 100) / 100);
  const bal = opts.balanceUsd.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const cap = opts.capUsd.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const roomStr = room.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  let tip = "";
  if (opts.dueTotalUsd != null) {
    const short = Math.max(0, Math.round((opts.dueTotalUsd - opts.balanceUsd) * 100) / 100);
    if (short > 0) {
      tip = ` You're short $${short.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} toward this month's dues.`;
    }
  }
  return `Your rent wallet balance is $${bal}. Cap $${cap} — you can still add up to $${roomStr}.${tip}`;
}
