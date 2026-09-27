import { parseTenantRequest } from "./gemini.ts";

console.log(
  await parseTenantRequest("Can I pay on the 5th?")
);

console.log(
  await parseTenantRequest("Why is my ConEd bill $38?")
);
