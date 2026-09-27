import { generateTenantReply } from "./gemini.ts";

const reply = await generateTenantReply({
  userText: "Why do I owe $1488?",
  facts: {
    tenantName: "Abhimanyu",
    rentUsd: 1450,
    utilitiesUsd: 38,
    lateFeeUsd: 0,
    totalUsd: 1488,
    dueDate: "2026-10-01",
    daysLate: 0,
    reason: "October rent + ConEd share",
  },
});

console.log(reply);
