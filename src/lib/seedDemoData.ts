import { getDb } from "./mongodb.ts";
import { building, tenants, tenantAgents, dues } from "../data/demoBuilding.ts";
import type { Building, Tenant, TenantAgent, Due } from "../../types/rent";

export async function seedDemoData() {
  const db = await getDb();
  const buildingsCollection = db.collection<Building>("buildings");
  const tenantsCollection = db.collection<Tenant>("tenants");
  const agentsCollection = db.collection<TenantAgent>("tenantAgents");
  const duesCollection = db.collection<Due>("dues");

  // Enforce the same natural keys used by the upserts, including on concurrent runs.
  await buildingsCollection.createIndex({ id: 1 }, { unique: true });
  await tenantsCollection.createIndex({ id: 1 }, { unique: true });
  await agentsCollection.createIndex({ id: 1 }, { unique: true });
  await duesCollection.createIndex({ tenantId: 1, month: 1 }, { unique: true });

  await buildingsCollection.updateOne(
    { id: building.id },
    { $set: building },
    { upsert: true }
  );

  for (const tenant of tenants) {
    await tenantsCollection.updateOne(
      { id: tenant.id },
      { $set: tenant },
      { upsert: true }
    );
  }

  for (const agent of tenantAgents) {
    await agentsCollection.updateOne(
      { id: agent.id },
      { $set: agent },
      { upsert: true }
    );
  }

  for (const due of dues) {
    await duesCollection.updateOne(
      { tenantId: due.tenantId, month: due.month },
      { $set: due },
      { upsert: true }
    );
  }

  return {
    building: 1,
    tenants: tenants.length,
    tenantAgents: tenantAgents.length,
    dues: dues.length,
  };
}
