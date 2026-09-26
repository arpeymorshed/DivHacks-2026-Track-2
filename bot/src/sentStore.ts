// Remembers which outbox message ids were already delivered, persisted to a
// small JSON file so a restart never re-sends a message.

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";

export function createSentStore(path: string) {
  const ids = new Set<string>();

  if (existsSync(path)) {
    try {
      const saved = JSON.parse(readFileSync(path, "utf8"));
      if (Array.isArray(saved)) for (const id of saved) if (typeof id === "string") ids.add(id);
    } catch (err) {
      // Refuse to start rather than risk re-sending every message.
      throw new Error(`Could not read ${path}: ${(err as Error).message}. Fix or remove the file and restart.`);
    }
  }

  return {
    size: () => ids.size,
    has: (id: string) => ids.has(id),
    add(id: string) {
      ids.add(id);
      // Write to a temp file then rename, so a crash mid-write can't corrupt it.
      const tmp = `${path}.tmp`;
      writeFileSync(tmp, JSON.stringify([...ids], null, 2));
      renameSync(tmp, path);
    },
  };
}
