import { GoogleGenAI } from "@google/genai";

export type TenantChatFacts = {
  tenantName: string;
  rentUsd: number;
  utilitiesUsd: number;
  lateFeeUsd: number;
  totalUsd: number;
  dueDate: string;
  daysLate: number;
  reason?: string;
};

export type GenerateTenantReplyInput = {
  userText: string;
  facts: TenantChatFacts;
};

export async function generateTenantReply({
  userText,
  facts,
}: GenerateTenantReplyInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: `
You are RentRelay, a personal rent assistant for a tenant.

Use ONLY the trusted facts below.

TRUSTED FACTS:
- Tenant: ${facts.tenantName}
- Rent: $${facts.rentUsd}
- Utilities: $${facts.utilitiesUsd}
- Late fee: $${facts.lateFeeUsd}
- Total due: $${facts.totalUsd}
- Due date: ${facts.dueDate}
- Days late: ${facts.daysLate}
${facts.reason ? `- Reason: ${facts.reason}` : ""}

TENANT MESSAGE:
"${userText}"

RULES:
- Never invent or change financial amounts.
- Trusted facts are the source of truth.
- Do not calculate a different balance.
- Do not claim a payment happened unless the facts say so.
- Do not claim you can move money yourself.
- If the question is unrelated to rent, politely steer back to RentRelay.
- Keep the response concise, friendly, and conversational.
- Usually answer in 1-3 sentences.
`,
  });

  const reply = response.text?.trim();

  if (!reply) {
    throw new Error("Gemini returned an empty response");
  }

  return reply;
}
