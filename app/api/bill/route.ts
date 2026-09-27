import { NextResponse } from "next/server";

import { extractUtilityBill } from "@/agent/billVision";
import { MAX_UTILITIES_USD, splitUtilityBillByShares, unitChargeFor } from "@/agent/utilitySplit";
import { requireDemoKey } from "@/lib/demoKey";

import {
  getBuilding,
  getTenants,
  setUtilityShares,
} from "@/services/rentRepository";

const SUPPORTED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const denied = requireDemoKey(request);
  if (denied) return denied;

  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const unitId = formData.get("unitId");
    const month = formData.get("month");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "A utility bill file is required" },
        { status: 400 }
      );
    }

    if (
      typeof unitId !== "string" ||
      unitId.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "unitId is required" },
        { status: 400 }
      );
    }

    if (
      typeof month !== "string" ||
      !/^\d{4}-\d{2}$/.test(month)
    ) {
      return NextResponse.json(
        { error: "month must use YYYY-MM format" },
        { status: 400 }
      );
    }

    if (!SUPPORTED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error:
            "Supported bill types are PNG, JPEG, WEBP, and PDF",
        },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "Bill file is empty" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Bill file must be 10 MB or smaller" },
        { status: 400 }
      );
    }

    /*
     * Step 1:
     * Resolve the selected unit using trusted building data.
     * Gemini does not decide which unit receives the bill.
     */
    const building = await getBuilding();

    const unit = building.units.find(
      (candidate) => candidate.id === unitId.trim()
    );

    if (!unit) {
      return NextResponse.json(
        { error: "Unknown unit" },
        { status: 404 }
      );
    }

    /*
     * Step 2:
     * Resolve the tenants and their trusted shares.
     */
    const tenants = await getTenants();

    const unitTenants = unit.tenantIds.map((tenantId) =>
      tenants.find((tenant) => tenant.id === tenantId)
    );

    if (unitTenants.some((tenant) => !tenant)) {
      return NextResponse.json(
        { error: "Unit tenant data is incomplete" },
        { status: 500 }
      );
    }

    const trustedTenants = unitTenants.map((tenant) => {
      if (!tenant) {
        throw new Error("Unit tenant data is incomplete");
      }

      return {
        tenantId: tenant.id,
        share: tenant.share,
      };
    });

    /*
     * Step 3:
     * Gemini Vision reads facts from the uploaded bill.
     */
    const fileBuffer = Buffer.from(
      await file.arrayBuffer()
    );

    const extractedBill = await extractUtilityBill(
      fileBuffer.toString("base64"),
      file.type
    );

    /*
     * Step 4:
     * Deterministic backend code calculates each tenant's share.
     * Gemini never performs the authoritative money calculation.
     */
    // A sub-metered building bill lists each unit's charge; use this unit's line (not the building total).
    const unitCharge = unitChargeFor(extractedBill, unit.name);

    if (unitCharge === null) {
      return NextResponse.json(
        { error: `This bill has no charge for unit ${unit.name}`, bill: extractedBill },
        { status: 400 }
      );
    }

    const shares = splitUtilityBillByShares(
      unitCharge,
      trustedTenants
    );

    const overLimit = shares.filter((share) => share.amountUsd > MAX_UTILITIES_USD);

    if (overLimit.length > 0) {
      return NextResponse.json(
        {
          error: `Utility share over the $${MAX_UTILITIES_USD} per-tenant limit; not saved (the Guardian would refuse that rent)`,
          bill: extractedBill,
          shares,
        },
        { status: 400 }
      );
    }

    /*
     * Step 5:
     * Write the calculated utility amounts to MongoDB.
     */
    const updatedDues = await setUtilityShares(
      month,
      shares
    );

    return NextResponse.json({
      bill: extractedBill,
      unit: {
        id: unit.id,
        name: unit.name,
      },
      unitChargeUsd: unitCharge,
      shares,
      updatedDues: updatedDues.map((due) => ({
        tenantId: due.tenantId,
        month: due.month,
        utilitiesUsd: due.utilitiesUsd,
      })),
    });
  } catch (error) {
    console.error(
      "Utility bill processing failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      { error: "Unable to process utility bill" },
      { status: 500 }
    );
  }
}
