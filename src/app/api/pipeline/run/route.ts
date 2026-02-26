import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline/orchestrator";

export async function GET() {
  console.log("=== API HIT: GET /api/pipeline/run ===");
  try {
    console.log("[Route] Initiating pipeline workflow...");
    const result = await runPipeline();
    console.log("[Route] Pipeline workflow finished successfully.");

    return NextResponse.json({
      success: true,
      staleDealsFound: result.staleDealsFound,
      followUpsCreated: result.followUpsCreated,
      records: result.records.map((r) => ({
        id: r.id,
        dealName: r.dealName,
        urgency: r.urgencyScore,
        contact: r.contactEmail,
        status: r.status,
      })),
    });
  } catch (error) {
    console.error("Pipeline error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
