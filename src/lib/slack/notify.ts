import { slackClient } from "./client";
import { env } from "@/lib/env";
import type { FollowUpRecord } from "@/types/follow-up";

const URGENCY_EMOJI: Record<string, string> = {
  critical: ":red_circle:",
  high: ":large_orange_circle:",
  medium: ":large_yellow_circle:",
  low: ":white_circle:",
};

export async function postFollowUpNotification(
  record: FollowUpRecord,
): Promise<string> {
  const client = slackClient();
  const emoji = URGENCY_EMOJI[record.urgencyScore] ?? ":white_circle:";

  const result = await client.chat.postMessage({
    channel: env().SLACK_CHANNEL_ID,
    text: `Follow-up needed: ${record.dealName}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${record.dealName}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Urgency:* ${emoji} ${record.urgencyScore.toUpperCase()}` },
          { type: "mrkdwn", text: `*Contact:* ${record.contactName}` },
          { type: "mrkdwn", text: `*Email:* ${record.contactEmail}` },
          { type: "mrkdwn", text: `*Owner:* ${record.ownerEmail}` },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Why:* ${record.urgencyReason}`,
        },
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Subject:* ${record.draftSubject}\n\n${record.draftBody}`,
        },
      },
      { type: "divider" },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Approve & Send", emoji: true },
            style: "primary",
            action_id: "approve_send",
            value: record.id,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Dismiss", emoji: true },
            style: "danger",
            action_id: "dismiss",
            value: record.id,
          },
        ],
      },
    ],
  });

  return result.ts ?? "";
}

export async function updateSlackMessage(
  messageTs: string,
  status: "sent" | "dismissed",
  dealName: string,
): Promise<void> {
  const client = slackClient();
  const text =
    status === "sent"
      ? `:white_check_mark: *Sent* — Follow-up email for *${dealName}* has been sent.`
      : `:x: *Dismissed* — Follow-up for *${dealName}* was dismissed.`;

  await client.chat.update({
    channel: env().SLACK_CHANNEL_ID,
    ts: messageTs,
    text,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text },
      },
    ],
  });
}
