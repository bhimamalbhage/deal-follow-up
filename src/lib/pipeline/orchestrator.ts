import { detectStalDeals } from "./detect";
import { scoreStalDeals } from "./score";
import { draftEmails } from "./draft";
import { notifyAll } from "./notify";
import type { FollowUpRecord } from "@/types/follow-up";

export interface PipelineResult {
  staleDealsFound: number;
  followUpsCreated: number;
  records: FollowUpRecord[];
}

export async function runPipeline(): Promise<PipelineResult> {
  console.log("[Pipeline] Starting pipeline run...");
  // Step 1: Detect stale deals
  console.log("[Pipeline] Step 1: Detecting stale deals...");
  const staleDeals = await detectStalDeals();
  console.log(`[Pipeline] Step 1 Complete: Found ${staleDeals.length} stale deals.`);
  if (staleDeals.length === 0) {
    console.log("[Pipeline] No stale deals found. Exiting early.");
    return { staleDealsFound: 0, followUpsCreated: 0, records: [] };
  }

  // Step 2: Score urgency
  console.log(`[Pipeline] Step 2: Scoring urgency for ${staleDeals.length} deals...`);
  const scoredDeals = await scoreStalDeals(staleDeals);

  // Step 3: Draft follow-up emails
  console.log(`[Pipeline] Step 3: Drafting emails for ${scoredDeals.length} deals...`);
  const draftedDeals = await draftEmails(scoredDeals);

  // Step 4: Notify via Slack and persist
  console.log(`[Pipeline] Step 4: Notifying via Slack for ${draftedDeals.length} deals...`);
  const records = await notifyAll(draftedDeals);

  console.log(`[Pipeline] Pipeline execution complete. Found ${staleDeals.length}, created ${records.length}.`);

  return {
    staleDealsFound: staleDeals.length,
    followUpsCreated: records.length,
    records,
  };
}
