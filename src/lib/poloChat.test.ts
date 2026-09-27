import assert from "node:assert/strict";
import {
  applyTopUp,
  buildPoloReply,
  isCapIntent,
  isOweIntent,
  isWalletBalanceIntent,
  isWhenDueIntent,
  parseTopUpAmount,
  wantsTopUp,
  type TenantChatState,
} from "./poloChat.ts";

const abhi: TenantChatState = {
  name: "Abhimanyu Dudeja",
  unit: "4B",
  bal: 1520,
  cap: 1600,
  rS: 1450,
  ut: 38,
  lf: 0,
  st: "paid",
  dl: 0,
};

const kashish: TenantChatState = {
  name: "Kashish",
  unit: "4B",
  bal: 980,
  cap: 1600,
  rS: 1450,
  ut: 38,
  lf: 15,
  st: "late",
  dl: 8,
};

function topUpOk(tn: TenantChatState) {
  return (amount: number) => applyTopUp(tn, amount);
}

// --- Intent classification ---
for (const q of [
  "What's my wallet balance?",
  "whats my wallet balance",
  "What is my wallet balance",
  "current wallet balance",
  "my balance",
  "show me my balance",
  "how much is in my wallet",
  "wallet balance",
  "Wallet balance",
]) {
  assert.equal(isWalletBalanceIntent(q), true, `expected wallet intent: ${q}`);
  assert.equal(wantsTopUp(q), false, `wallet query must not be top-up: ${q}`);
  assert.equal(parseTopUpAmount(q), null, `wallet query must not parse amount: ${q}`);
}

for (const q of ["Top up $100", "top up 250", "add $50 to my wallet", "deposit 100"]) {
  assert.equal(wantsTopUp(q), true, `expected top-up: ${q}`);
  assert.equal(isWalletBalanceIntent(q), false, `top-up must not be wallet intent: ${q}`);
}

assert.equal(isCapIntent("What's my cap?"), true);
assert.equal(isWhenDueIntent("when do I owe my rent"), true);
assert.equal(isOweIntent("how much do I owe"), true);
assert.equal(isOweIntent("What's my wallet balance?"), false);

// --- Wallet balance replies must include the $ amount ---
{
  const reply = buildPoloReply("What's my wallet balance?", abhi, topUpOk(abhi));
  assert.equal(reply.r, "a");
  assert.match(reply.t, /\$1,520\.00/);
  assert.match(reply.t, /cap \$1,600\.00/i);
  assert.doesNotMatch(reply.t, /how much should i add/i);
}

{
  const reply = buildPoloReply("current wallet balance", kashish, topUpOk(kashish));
  assert.match(reply.t, /\$980\.00/);
  assert.match(reply.t, /short \$523\.00/);
}

// --- Owe / when ---
{
  const reply = buildPoloReply("what do I owe", kashish, topUpOk(kashish));
  assert.match(reply.t, /\$1,503\.00/);
  assert.match(reply.t, /\$980\.00/);
}
{
  const reply = buildPoloReply("when do I owe my rent", abhi, topUpOk(abhi));
  assert.match(reply.t, /Oct 1/);
  assert.match(reply.t, /\$1,488\.00/);
}

// --- Top up success + cap rejection ---
{
  const reply = buildPoloReply("Top up $50", abhi, topUpOk(abhi));
  assert.equal(reply.r, "a");
  assert.match(reply.t, /added \$50\.00/i);
  assert.match(reply.t, /\$1,570\.00/);
}
{
  const reply = buildPoloReply("Top up $500", abhi, topUpOk(abhi));
  assert.equal(reply.r, "err");
  assert.match(reply.t, /over the \$1,600\.00 cap/i);
  assert.match(reply.t, /retry/i);
  assert.match(reply.t, /\$80\.00/); // room = 1600 - 1520
}
{
  const reply = buildPoloReply("top up", kashish, topUpOk(kashish));
  assert.equal(reply.r, "a");
  assert.match(reply.t, /how much should i add/i);
  assert.match(reply.t, /\$620\.00/); // room
}

// --- applyTopUp boundaries ---
{
  const ok = applyTopUp(abhi, 80);
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.bal, 1600);
}
{
  const bad = applyTopUp(abhi, 80.01);
  assert.equal(bad.ok, false);
}
{
  const bad = applyTopUp(abhi, 0);
  assert.equal(bad.ok, false);
}

// --- Canned exact still works ---
{
  const canned = { "Why is ConEd $38?": "Because sq ft split." };
  const reply = buildPoloReply("Why is ConEd $38?", abhi, topUpOk(abhi), canned);
  assert.equal(reply.t, "Because sq ft split.");
}

// --- Ambiguous / regression: wallet must win over top-up & owe ---
for (const q of [
  "What's my current wallet balance?",
  "show wallet balance",
  "balance please",
  "my wallet",
]) {
  const reply = buildPoloReply(q, abhi, topUpOk(abhi));
  assert.match(reply.t, /\$1,520\.00/, `must show balance for: ${q}`);
  assert.doesNotMatch(reply.t, /how much should i add/i, `must not prompt top-up for: ${q}`);
}

// Cap question
{
  const reply = buildPoloReply("What's my cap?", abhi, topUpOk(abhi));
  assert.match(reply.t, /\$1,600\.00/);
  assert.match(reply.t, /\$80\.00/);
}

// Full cap — top-up refused
{
  const full = { ...abhi, bal: 1600 };
  const reply = buildPoloReply("top up", full, topUpOk(full));
  assert.match(reply.t, /at the \$1,600\.00 cap/i);
}

console.log("poloChat checks passed: wallet balance, owe/when, top-up, and cap rejection.");
