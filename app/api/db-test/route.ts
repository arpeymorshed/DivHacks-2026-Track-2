import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    const collection = db.collection("connectionTests");
    const document = {
      message: "Aartee MongoDB connection works",
      createdAt: new Date(),
    };
    const result = await collection.insertOne(document);
    const saved = await collection.findOne({ _id: result.insertedId });

    if (!saved || saved.message !== document.message) {
      throw new Error("MongoDB connection test document could not be read back");
    }

    return NextResponse.json({
      success: true,
      insertedId: result.insertedId.toHexString(),
      readBack: true,
    });
  } catch (error) {
    // Driver error messages can contain connection details; log only the class.
    console.error("MongoDB test failed:", error instanceof Error ? error.name : "UnknownError");

    return NextResponse.json(
      { success: false, error: "MongoDB connection failed" },
      { status: 500 }
    );
  }
}
