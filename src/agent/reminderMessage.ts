import { GoogleGenAI } from "@google/genai";
import type { DueStage } from "../../types/rent.ts";

export type ReminderStage = Exclude<DueStage, "paid">;

export type ReminderFacts = {
  tenantName: string;
  stage: ReminderStage;
  rentUsd: number;
  utilitiesUsd: number;
  lateFeeUsd: number;
  totalUsd: number;
  dueDate: string;
  daysLate: number;
  payLaterUntil?: string;
};

function fallbackReminderMessage(
  facts: ReminderFacts
): string {
  switch (facts.stage) {
    case "upcoming":
      return (
        `${facts.tenantName}, your rent total of $${facts.totalUsd} ` +
        `is due on ${facts.dueDate}.`
      );

    case "due":
      return (
        `${facts.tenantName}, your rent total of $${facts.totalUsd} ` +
        `is due today.`
      );

    case "grace":
      if (facts.payLaterUntil) {
        return (
          `${facts.tenantName}, your current total is $${facts.totalUsd}. ` +
          `Your approved payment date is ${facts.payLaterUntil}.`
        );
      }

      return (
        `${facts.tenantName}, your current rent total is $${facts.totalUsd}. ` +
        `You are currently within the grace period.`
      );

    case "late":
      return (
        `${facts.tenantName}, your rent is ${facts.daysLate} days late. ` +
        `Your current total is $${facts.totalUsd}, including ` +
        `a $${facts.lateFeeUsd} late fee.`
      );
  }
}

function isTemporaryGeminiError(
  error: unknown
): boolean {
  if (
    typeof error !== "object" ||
    error === null ||
    !("status" in error)
  ) {
    return false;
  }

  const status = (error as { status?: unknown }).status;

  return status === 429 || status === 503;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, milliseconds)
  );
}

export async function generateReminderMessage(
  facts: ReminderFacts
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return fallbackReminderMessage(facts);
  }

  const ai = new GoogleGenAI({ apiKey });

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `
You are RentRelay, a personal rent assistant sending a short reminder to a tenant.

Use ONLY the trusted facts below.

TRUSTED FACTS:
- Tenant: ${facts.tenantName}
- Stage: ${facts.stage}
- Rent: $${facts.rentUsd}
- Utilities: $${facts.utilitiesUsd}
- Late fee: $${facts.lateFeeUsd}
- Total due: $${facts.totalUsd}
- Due date: ${facts.dueDate}
- Days late: ${facts.daysLate}
${
  facts.payLaterUntil
    ? `- Approved pay-later date: ${facts.payLaterUntil}`
    : ""
}

STAGE MEANINGS:
- upcoming: rent is not due yet
- due: rent is due today
- grace: the due date has passed but the tenant is still in the grace period
- late: the tenant is past the grace period

RULES:
- Never invent or change any amount, date, fee, or payment status.
- Do not claim payment happened.
- Do not claim you can move money.
- If an approved pay-later date exists, you may mention it.
- Match the wording to the provided stage.
- Be friendly and clear, not threatening.
- Keep the message concise enough for a text message.
- Usually use 1-2 sentences.
`,
      });

      const message = response.text?.trim();

      if (message) {
        return message;
      }

      throw new Error("Gemini returned an empty reminder");
    } catch (error) {
      const shouldRetry =
        isTemporaryGeminiError(error) &&
        attempt < 3;

      if (shouldRetry) {
        await wait(attempt * 750);
        continue;
      }

      console.warn(
        "Gemini reminder unavailable; using fallback:",
        error instanceof Error
          ? error.name
          : "UnknownError"
      );

      return fallbackReminderMessage(facts);
    }
  }

  return fallbackReminderMessage(facts);
}
