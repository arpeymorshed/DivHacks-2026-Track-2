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

export type TenantRequestIntent =
  | {
      intent: "pay_later";
      requestedDay: number | null;
    }
  | {
      intent: "question";
      requestedDay: null;
    };

export async function parseTenantRequest(
  userText: string
): Promise<TenantRequestIntent> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: `
Classify this message sent to a rent assistant:

"${userText}"

Return ONLY JSON in this exact shape:
{
  "intent": "pay_later" or "question",
  "requestedDay": number or null
}

Rules:
- intent = "pay_later" only when the tenant is asking to delay or schedule their rent payment.
- requestedDay is the day of the month they requested, as an integer.
- If no specific day is given, requestedDay must be null.
- All other messages use intent = "question".
`,
    config: {
      responseMimeType: "application/json"
    }
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty intent response");
  }

  const cleaned = response.text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```$/, "")
    .trim();

  const parsed = JSON.parse(cleaned) as TenantRequestIntent;

  if (
    parsed.intent !== "pay_later" &&
    parsed.intent !== "question"
  ) {
    throw new Error("Gemini returned an invalid intent");
  }

  return parsed;
}
