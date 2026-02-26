import { NextResponse } from "next/server";
import { getAll } from "@/lib/store";

export async function GET() {
  try {
    const records = await getAll();
    return NextResponse.json({ success: true, records });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
