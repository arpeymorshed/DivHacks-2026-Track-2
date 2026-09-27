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

export async function setUtilityShares(
  month: string,
  shares: Array<{ tenantId: string; amountUsd: number }>
): Promise<Due[]> {
  if (shares.length === 0) {
    throw new Error("At least one utility share is required");
  }

  const tenantIds = shares.map((share) => share.tenantId);

  if (new Set(tenantIds).size !== tenantIds.length) {
    throw new Error("Duplicate tenant IDs are not allowed");
  }

  for (const share of shares) {
    if (
      !share.tenantId ||
      !Number.isFinite(share.amountUsd) ||
      share.amountUsd < 0
    ) {
      throw new Error("Invalid utility share");
    }
  }

  const db = await getDb();
  const dues = db.collection<Due>("dues");

  const existing = await dues
    .find({
      month,
      tenantId: { $in: tenantIds },
    })
    .toArray();

  if (existing.length !== shares.length) {
    const existingIds = new Set(existing.map((due) => due.tenantId));

    const missingIds = tenantIds.filter(
      (tenantId) => !existingIds.has(tenantId)
    );

    throw new Error(
      `Missing dues for tenant(s): ${missingIds.join(", ")}`
    );
  }

  await dues.bulkWrite(
    shares.map((share) => ({
      updateOne: {
        filter: {
          tenantId: share.tenantId,
          month,
        },
        update: {
          $set: {
            utilitiesUsd: share.amountUsd,
          },
        },
      },
    }))
  );

  return dues
    .find({
      month,
      tenantId: { $in: tenantIds },
    })
    .sort({ tenantId: 1 })
    .toArray();
}
