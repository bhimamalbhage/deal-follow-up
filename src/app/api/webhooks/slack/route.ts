import { NextResponse } from "next/server";
import { verifySlackSignature } from "@/lib/slack/verify";
import { executeApproval, executeDismissal } from "@/lib/pipeline/execute";

export async function POST(request: Request) {
  console.log("=== API HIT: POST /api/webhooks/slack ===");
  // Read raw body for signature verification
  const rawBody = await request.text();
  console.log("[Webhook/Slack] Received POST request from Slack.");
  const timestamp = request.headers.get("x-slack-request-timestamp") ?? "";
  const signature = request.headers.get("x-slack-signature") ?? "";

  if (!verifySlackSignature(rawBody, timestamp, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Slack sends interactive payloads as URL-encoded form data
  const params = new URLSearchParams(rawBody);
  const payloadStr = params.get("payload");
  if (!payloadStr) {
    return NextResponse.json({ error: "Missing payload" }, { status: 400 });
  }

  const payload = JSON.parse(payloadStr);
  const action = payload.actions?.[0];
  if (!action) {
    return NextResponse.json({ error: "No action found" }, { status: 400 });
  }

  const followUpId = action.value;
  const actionId = action.action_id;

  console.log(`[Webhook/Slack] Parsed interactive action: ${actionId} for follow-up ID: ${followUpId}`);

  try {
    if (actionId === "approve_send") {
      console.log(`[Webhook/Slack] Executing approval process for ID: ${followUpId}...`);
      const result = await executeApproval(followUpId);
      if (!result) {
        return NextResponse.json({ error: "Follow-up not found or already processed" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, action: "sent", dealName: result.dealName });
    }

    if (actionId === "dismiss") {
      console.log(`[Webhook/Slack] Executing dismissal process for ID: ${followUpId}...`);
      const result = await executeDismissal(followUpId);
      if (!result) {
        return NextResponse.json({ error: "Follow-up not found or already processed" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, action: "dismissed", dealName: result.dealName });
    }

    return NextResponse.json({ error: `Unknown action: ${actionId}` }, { status: 400 });
  } catch (error) {
    console.error("Slack webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
