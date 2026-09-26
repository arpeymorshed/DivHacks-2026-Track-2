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
