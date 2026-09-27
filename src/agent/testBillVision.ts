import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { extractUtilityBill } from "./billVision.ts";

const imagePath = process.argv[2];

if (!imagePath) {
  throw new Error(
    "Usage: node --env-file=.env.local src/agent/testBillVision.ts <image-path>"
  );
}

const extension = extname(imagePath).toLowerCase();

const mimeTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const mimeType = mimeTypes[extension];

if (!mimeType) {
  throw new Error("Supported image types: PNG, JPG, JPEG, WEBP");
}

const image = await readFile(imagePath);
const imageBase64 = image.toString("base64");

const bill = await extractUtilityBill(
  imageBase64,
  mimeType
);

console.log(bill);
