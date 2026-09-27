import { splitUtilityBill } from "./utilitySplit.ts";

console.log(
  "114 / 3:",
  splitUtilityBill(114, ["abhimanyu", "kashish", "musammat"])
);

console.log(
  "100 / 3:",
  splitUtilityBill(100, ["a", "b", "c"])
);
