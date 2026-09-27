import { equal } from "node:assert/strict";
import { asksAboutWallet, mightBePayLater, walletSentence } from "./walletReply.ts";

for (const t of ["what's my wallet balance", "do I have enough?", "how much should I top up", "am I short", "Balance?"]) equal(asksAboutWallet(t), true, t);
for (const t of ["why is ConEd $38?", "when is rent due"]) equal(asksAboutWallet(t), false, t);

for (const t of ["can I pay on the 5th?", "I get paid on the 5th", "can I pay later", "I need an extension", "pay by friday"]) equal(mightBePayLater(t), true, t);
for (const t of ["what's my wallet balance", "why is ConEd $38?", "what do I owe?"]) equal(mightBePayLater(t), false, t);

equal(walletSentence(1000, 1488), "Your rent wallet has $1,000. You owe $1,488, so you're $488 short. Top up to pay on time.");
equal(walletSentence(1500, 1488), "Your rent wallet has $1,500. You owe $1,488, so you're covered with $12 to spare.");
equal(walletSentence(1488, 1488), "Your rent wallet has $1,488. You owe $1,488, so you're covered.");
console.log("Wallet chat checks passed: wallet questions, pay-later detection, short/covered sentences.");
