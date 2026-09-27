import { MongoClient } from "mongodb";
import type { Db } from "mongodb";

// Share the connection promise across concurrent requests and development reloads.
const mongoGlobal = globalThis as typeof globalThis & {
  rentrelayMongoClientPromise?: Promise<MongoClient>;
};

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "rentrelay";

  // Validate when called so a missing local secret does not break Next.js builds.
  if (!uri) {
    throw new Error("MONGODB_URI is not defined");
  }

  if (!mongoGlobal.rentrelayMongoClientPromise) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    mongoGlobal.rentrelayMongoClientPromise = client.connect().catch(async (error) => {
      // A failed connection must not leave every future request stuck on it.
      mongoGlobal.rentrelayMongoClientPromise = undefined;
      await client.close().catch(() => undefined);
      throw error;
    });
  }

  const client = await mongoGlobal.rentrelayMongoClientPromise;
  return client.db(dbName);
}
