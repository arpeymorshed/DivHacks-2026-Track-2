import { GoogleGenAI } from "@google/genai";

export type ExtractedUtilityBill = {
  provider: string;
  totalUsd: number;
  billingPeriod: string | null;
  dueDate: string | null;
};

export async function extractUtilityBill(
  imageBase64: string,
  mimeType: string
): Promise<ExtractedUtilityBill> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `
Read this utility bill and extract ONLY these facts:

- provider: utility company name
- totalUsd: total bill amount as a number
- billingPeriod: billing period as text, or null if unavailable
- dueDate: due date in YYYY-MM-DD format, or null if unavailable

Return ONLY JSON in this exact shape:

{
  "provider": "string",
  "totalUsd": 0,
  "billingPeriod": "string or null",
  "dueDate": "YYYY-MM-DD or null"
}

Do not calculate tenant shares.
Do not invent missing information.
`,
          },
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty bill response");
  }

  const raw = response.text.trim();
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
    throw new Error("Gemini returned invalid bill JSON");
  }

  const parsed = JSON.parse(
    raw.slice(jsonStart, jsonEnd + 1)
  ) as ExtractedUtilityBill;

  if (
    typeof parsed.provider !== "string" ||
    typeof parsed.totalUsd !== "number" ||
    !Number.isFinite(parsed.totalUsd) ||
    parsed.totalUsd < 0
  ) {
    throw new Error("Gemini returned invalid bill data");
  }

  return parsed;
}
