import { GoogleGenAI } from "@google/genai";

export type UnitCharge = { unit: string; chargeUsd: number };

export type ExtractedUtilityBill = {
  provider: string;
  totalUsd: number;
  // Per-unit lines on a sub-metered building bill (e.g. "Unit 4B $76.00"); [] when the bill has none.
  units: UnitCharge[];
  billingPeriod: string | null;
  dueDate: string | null;
};

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function validateExtractedUtilityBill(
  value: unknown
): ExtractedUtilityBill {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error("Gemini returned invalid bill data");
  }

  const parsed = value as Record<string, unknown>;

  const provider = parsed.provider;
  const totalUsd = parsed.totalUsd;
  const billingPeriod = parsed.billingPeriod;
  const dueDate = parsed.dueDate;
  const units = parsed.units ?? [];

  if (!Array.isArray(units)) {
    throw new Error("Gemini returned invalid unit charges");
  }
  const validatedUnits: UnitCharge[] = units.map((u) => {
    const unit = (u as Record<string, unknown>)?.unit;
    const chargeUsd = (u as Record<string, unknown>)?.chargeUsd;
    if (typeof unit !== "string" || unit.trim().length === 0 || typeof chargeUsd !== "number" || !Number.isFinite(chargeUsd) || chargeUsd < 0) {
      throw new Error("Gemini returned an invalid unit charge");
    }
    return { unit: unit.trim(), chargeUsd };
  });

  if (
    typeof provider !== "string" ||
    provider.trim().length === 0
  ) {
    throw new Error("Gemini returned an invalid provider");
  }

  if (
    typeof totalUsd !== "number" ||
    !Number.isFinite(totalUsd) ||
    totalUsd < 0
  ) {
    throw new Error("Gemini returned an invalid bill total");
  }

  let validatedBillingPeriod: string | null;

  if (billingPeriod === null) {
    validatedBillingPeriod = null;
  } else if (
    typeof billingPeriod === "string" &&
    billingPeriod.trim().length > 0
  ) {
    validatedBillingPeriod = billingPeriod.trim();
  } else {
    throw new Error("Gemini returned an invalid billing period");
  }

  let validatedDueDate: string | null;

  if (dueDate === null) {
    validatedDueDate = null;
  } else if (
    typeof dueDate === "string" &&
    isValidIsoDate(dueDate)
  ) {
    validatedDueDate = dueDate;
  } else {
    throw new Error("Gemini returned an invalid due date");
  }

  return {
    provider: provider.trim(),
    totalUsd,
    units: validatedUnits,
    billingPeriod: validatedBillingPeriod,
    dueDate: validatedDueDate,
  };
}

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
- units: if the bill lists separate charges per apartment/unit (sub-metered, e.g. "Unit 4B $76.00"),
  each one as {"unit": "4B", "chargeUsd": 76}; otherwise an empty array
- billingPeriod: billing period as text, or null if unavailable
- dueDate: due date in YYYY-MM-DD format, or null if unavailable

Return ONLY JSON in this exact shape:

{
  "provider": "string",
  "totalUsd": 0,
  "units": [{ "unit": "string", "chargeUsd": 0 }],
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

  if (
    jsonStart === -1 ||
    jsonEnd === -1 ||
    jsonEnd < jsonStart
  ) {
    throw new Error("Gemini returned invalid bill JSON");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(
      raw.slice(jsonStart, jsonEnd + 1)
    );
  } catch {
    throw new Error("Gemini returned invalid bill JSON");
  }

  return validateExtractedUtilityBill(parsed);
}
