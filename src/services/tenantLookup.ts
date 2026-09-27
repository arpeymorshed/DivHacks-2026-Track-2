import { tenants } from "../data/demoBuilding.ts";
import type { Tenant } from "../../types/rent";

export function getTenantByPhone(
  phoneNumber: string
): Tenant | undefined {
  // Unconfigured tenants have empty phone numbers; never match an empty sender.
  if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
    return undefined;
  }

  return tenants.find(
    (tenant) => tenant.phoneNumber === phoneNumber
  );
}
