import { getDb } from "../lib/mongodb.ts";
import type { Building, Tenant, TenantAgent, Due } from "../../types/rent";

export async function getBuilding(): Promise<Building> {
  const db = await getDb();
  const building = await db.collection<Building>("buildings").findOne({ id: "building-1" });

  if (!building) {
    throw new Error("Building not found");
  }

  return building;
}

export async function getTenants(): Promise<Tenant[]> {
  const db = await getDb();
  return db.collection<Tenant>("tenants").find({}).sort({ id: 1 }).toArray();
}

export async function getTenantAgents(): Promise<TenantAgent[]> {
  const db = await getDb();
  return db.collection<TenantAgent>("tenantAgents").find({}).toArray();
}

export async function getDues(month: string): Promise<Due[]> {
  const db = await getDb();
  return db.collection<Due>("dues").find({ month }).toArray();
}

export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const db = await getDb();
  return db.collection<Tenant>("tenants").findOne({ id: tenantId });
}

export async function getDueForTenant(
  tenantId: string,
  month = "2026-10"
): Promise<Due | null> {
  const db = await getDb();
  return db.collection<Due>("dues").findOne({ tenantId, month });
}

export async function setPayLaterUntil(
  tenantId: string,
  payLaterUntil: string,
  month = "2026-10"
): Promise<Due | null> {
  const db = await getDb();

  const result = await db.collection<Due>("dues").updateOne(
    { tenantId, month },
    { $set: { payLaterUntil } }
  );

  if (result.matchedCount === 0) {
    return null;
  }

  return db.collection<Due>("dues").findOne({ tenantId, month });
}
