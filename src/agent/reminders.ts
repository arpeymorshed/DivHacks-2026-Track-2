import { generateReminderMessage } from "./reminderMessage.ts";
import { buildState } from "../services/stateService.ts";
import {
  getDues,
} from "../services/rentRepository.ts";
import {
  hasOutboxMessage,
  queueOutboxMessage,
} from "../services/outboxService.ts";

export async function queueRentReminders(): Promise<{
  queued: number;
  skippedDuplicate: number;
  skippedPaid: number;
}> {
  const state = await buildState();
  const dues = await getDues(state.clock.month);

  let queued = 0;
  let skippedDuplicate = 0;
  let skippedPaid = 0;

  for (const tenant of state.tenants) {
    const due = tenant.due;

    if (!due) {
      continue;
    }

    if (due.stage === "paid") {
      skippedPaid += 1;
      continue;
    }

    const dedupeKey =
      `rent-reminder:${due.month}:${due.stage}:${tenant.id}`;

    if (await hasOutboxMessage(dedupeKey)) {
      skippedDuplicate += 1;
      continue;
    }

    const storedDue = dues.find(
      (item) => item.tenantId === tenant.id
    );

    const message = await generateReminderMessage({
      tenantName: tenant.name,
      stage: due.stage,
      rentUsd: due.rentUsd,
      utilitiesUsd: due.utilitiesUsd,
      lateFeeUsd: due.lateFeeUsd,
      totalUsd: due.totalUsd,
      dueDate: due.dueDate,
      daysLate: due.daysLate,
      payLaterUntil: storedDue?.payLaterUntil,
    });

    await queueOutboxMessage(
      tenant.id,
      message,
      dedupeKey
    );

    queued += 1;
  }

  return {
    queued,
    skippedDuplicate,
    skippedPaid,
  };
}
