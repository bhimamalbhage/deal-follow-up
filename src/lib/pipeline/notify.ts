import { randomUUID } from "node:crypto";
import { postFollowUpNotification } from "@/lib/slack/notify";
import { save } from "@/lib/store";
import type { FollowUpRecord } from "@/types/follow-up";
import type { DraftedDeal } from "./draft";

export async function notifyAll(draftedDeals: DraftedDeal[]): Promise<FollowUpRecord[]> {
  console.log(`[Notify] Sending Slack notifications for ${draftedDeals.length} drafted deals...`);
  const records: FollowUpRecord[] = [];

  for (const { deal, urgency, draft } of draftedDeals) {
    console.log(`[Notify] Processing notification for deal ID: ${deal.dealId}...`);
    const record: FollowUpRecord = {
      id: randomUUID(),
      dealId: deal.dealId,
      dealName: deal.dealName,
      contactEmail: deal.contactEmail,
      contactName: deal.contactName,
      ownerEmail: deal.ownerEmail,
      urgencyScore: urgency.score,
      urgencyReason: urgency.reason,
      draftSubject: draft.subject,
      draftBody: draft.body,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    console.log(`[Notify] Sending Slack message for follow-up record ID: ${record.id}...`);
    const messageTs = await postFollowUpNotification(record);
    record.slackMessageTs = messageTs;
    console.log(`[Notify] Slack message sent successfully. Timestamp: ${messageTs}`);

    await save(record);
    records.push(record);
  }

  console.log(`[Notify] Completed notifications. ${records.length} records saved.`);
  return records;
}
