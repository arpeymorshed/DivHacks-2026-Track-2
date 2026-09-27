// Chat helpers for wallet questions (pure: no xrpl, no DB, no Gemini), so they're cheap to test.

// "what's my wallet balance", "do I have enough?", "how much should I top up", "am I short?"
export function asksAboutWallet(text: string): boolean {
  return /\b(wallet|balance|top[\s-]?up|topup|short|enough|funds?|covered)\b/i.test(text);
}

// Only these can be a "pay on the Nth" request, so only these need Gemini's intent parser
// (saves one Gemini call per ordinary question; the free tier allows ~20 calls a day).
export function mightBePayLater(text: string): boolean {
  return /\b(later|extension|extend|delay|postpone|push|reschedule|until|by the|on the|next week|payday|few days|couple (of )?days)\b/i.test(text)
    || /\b(mon|tues|wednes|thurs|fri|satur|sun)day\b/i.test(text)
    || /\bnext \w+/i.test(text)
    || /\bin \d+ days?\b/i.test(text)
    || /\b\d{1,2}(st|nd|rd|th)\b/i.test(text)
    || /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b/i.test(text)
    || /\bpay\b.*\b(on|by|after)\b/i.test(text);
}

const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

// "Your rent wallet has $1,000. You owe $1,488, so you're $488 short. Top up to pay on time."
export function walletSentence(balanceUsd: number, totalDueUsd: number): string {
  const diff = Math.round((totalDueUsd - balanceUsd) * 100) / 100;
  if (diff > 0) {
    return `Your rent wallet has ${money(balanceUsd)}. You owe ${money(totalDueUsd)}, so you're ${money(diff)} short. Top up to pay on time.`;
  }
  return `Your rent wallet has ${money(balanceUsd)}. You owe ${money(totalDueUsd)}, so you're covered${diff < 0 ? ` with ${money(-diff)} to spare` : ""}.`;
}
