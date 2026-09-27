import { generateReminderMessage } from "./reminderMessage.ts";

const examples = [
  {
    tenantName: "Abhimanyu",
    stage: "upcoming" as const,
    rentUsd: 1450,
    utilitiesUsd: 38,
    lateFeeUsd: 0,
    totalUsd: 1488,
    dueDate: "2026-10-01",
    daysLate: 0,
  },
  {
    tenantName: "Abhimanyu",
    stage: "due" as const,
    rentUsd: 1450,
    utilitiesUsd: 38,
    lateFeeUsd: 0,
    totalUsd: 1488,
    dueDate: "2026-10-01",
    daysLate: 0,
  },
  {
    tenantName: "Abhimanyu",
    stage: "grace" as const,
    rentUsd: 1450,
    utilitiesUsd: 38,
    lateFeeUsd: 0,
    totalUsd: 1488,
    dueDate: "2026-10-01",
    daysLate: 3,
    payLaterUntil: "2026-10-05",
  },
  {
    tenantName: "Abhimanyu",
    stage: "late" as const,
    rentUsd: 1450,
    utilitiesUsd: 38,
    lateFeeUsd: 15,
    totalUsd: 1503,
    dueDate: "2026-10-01",
    daysLate: 7,
  },
];

for (const example of examples) {
  console.log(`\n--- ${example.stage.toUpperCase()} ---`);

  const message = await generateReminderMessage(example);

  console.log(message);
}
