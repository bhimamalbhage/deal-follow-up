import { sendEmail } from "@/lib/hubspot/emails";
import { updateSlackMessage } from "@/lib/slack/notify";
import { getById, update } from "@/lib/store";
import type { FollowUpRecord } from "@/types/follow-up";

export async function executeApproval(followUpId: string): Promise<FollowUpRecord | null> {
  const record = await getById(followUpId);
  if (!record || record.status !== "pending") return null;

  await sendEmail(
    record.contactEmail,
    record.draftSubject,
    record.draftBody,
    record.dealId,
  );

  const updated = await update(followUpId, {
    status: "sent",
    sentAt: new Date().toISOString(),
  });

  if (record.slackMessageTs) {
    await updateSlackMessage(record.slackMessageTs, "sent", record.dealName);
  }

  return updated ?? null;
}

export async function executeDismissal(followUpId: string): Promise<FollowUpRecord | null> {
  const record = await getById(followUpId);
  if (!record || record.status !== "pending") return null;

  const updated = await update(followUpId, { status: "dismissed" });

  if (record.slackMessageTs) {
    await updateSlackMessage(record.slackMessageTs, "dismissed", record.dealName);
  }

  return updated ?? null;
}
