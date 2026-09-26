import { deepStrictEqual, equal, match, ok } from "node:assert/strict";

const baseUrl = "http://localhost:3000";
async function chat(body: unknown) {
  return fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

for (const [tenantId, total, rent, utilities] of [
  ["abhimanyu", 1488, 1450, 38],
  ["kashish", 1488, 1450, 38],
  ["musammat", 1952, 1900, 52],
]) {
  const response = await chat({ tenantId, text: "What do I OWE?" });
  equal(response.status, 200);
  deepStrictEqual(await response.json(), {
    reply: `You currently owe $${total}: $${rent} rent + $${utilities} utilities.`,
  });
}

const greeting = await chat({ tenantId: "musammat", text: "Hello!" });
equal(greeting.status, 200);
deepStrictEqual(await greeting.json(), { reply: "Hi Musammat! How can I help with your rent?" });

const dueQuestion = await chat({ tenantId: "musammat", text: "What is DUE?" });
equal(dueQuestion.status, 200);
deepStrictEqual(await dueQuestion.json(), { reply: "You currently owe $1952: $1900 rent + $52 utilities." });

const unknown = await chat({ tenantId: "fake-person", text: "What do I owe?" });
equal(unknown.status, 404);
deepStrictEqual(await unknown.json(), { error: "Unknown tenant" });

for (const body of [null, [], {}, { tenantId: "musammat" },
  { tenantId: "musammat", text: 42 }, { tenantId: 42, text: "owe" },
  { tenantId: "musammat", text: "   " }, { tenantId: "", text: "owe" }]) {
  const response = await chat(body);
  equal(response.status, 400);
  deepStrictEqual(await response.json(), { error: "tenantId and text are required" });
}
const malformed = await fetch(`${baseUrl}/api/chat`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: "{",
});
equal(malformed.status, 400);
deepStrictEqual(await malformed.json(), { error: "Invalid JSON body" });

const beforeResponse = await fetch(`${baseUrl}/api/outbox`);
equal(beforeResponse.status, 200);
const before = await beforeResponse.json();
ok(Array.isArray(before));

const rentDay = await fetch(`${baseUrl}/api/rent-day`, { method: "POST" });
equal(rentDay.status, 200);
const rentDayBody = await rentDay.json();
equal(rentDayBody.success, true);
equal(rentDayBody.results.length, 3);

const afterResponse = await fetch(`${baseUrl}/api/outbox`);
equal(afterResponse.status, 200);
match(afterResponse.headers.get("cache-control") ?? "", /no-store/);
const after = await afterResponse.json();
ok(Array.isArray(after));
// Existing sent reminders stay sent; only pending reminders are returned.
for (const message of before) {
  ok(after.some((current) => current.id === message.id));
}
for (const [tenantId, name, total] of [
  ["abhimanyu", "Abhimanyu", 1488],
  ["kashish", "Kashish", 1488],
  ["musammat", "Musammat", 1952],
]) {
  const reminders = after.filter((message) =>
    message.tenantId === tenantId && message.text === `${name}, your 2026-10 total is $${total}.`
  );
  ok(reminders.length <= 1, "Rent reminders must not be duplicated");
}
for (const message of after) {
  deepStrictEqual(Object.keys(message).sort(), ["id", "tenantId", "text"]);
  match(message.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
}
equal(new Set(after.map((message) => message.id)).size, after.length);

// Neither polling nor concurrent rent-day reruns should duplicate reminders.
for (const response of await Promise.all([
  fetch(`${baseUrl}/api/rent-day`, { method: "POST" }),
  fetch(`${baseUrl}/api/rent-day`, { method: "POST" }),
])) equal(response.status, 200);
const repeated = await fetch(`${baseUrl}/api/outbox`);
equal(repeated.status, 200);
deepStrictEqual(await repeated.json(), after);
const missingAck = await fetch(`${baseUrl}/api/outbox/${crypto.randomUUID()}/ack`, { method: "POST" });
equal(missingAck.status, 404);
deepStrictEqual(await missingAck.json(), { error: "Message not found" });
console.log("Photon HTTP checks passed: tenant replies, invalid requests, deduplicated rent-day messages, stable polling, and unknown acknowledgement.");
