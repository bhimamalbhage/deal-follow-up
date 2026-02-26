import { z } from "zod";
import { openaiClient } from "./client";
import type { DealContext } from "@/types/deal";
import type { UrgencyLevel } from "@/types/follow-up";

const draftResponseSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

export interface EmailDraft {
  subject: string;
  body: string;
}

export async function draftFollowUpEmail(
  deal: DealContext,
  urgencyScore: UrgencyLevel,
  urgencyReason: string,
): Promise<EmailDraft> {
  const client = openaiClient();

  const emailHistory = deal.recentEmails
    .map(
      (e) =>
        `From: ${e.from}\nTo: ${e.to}\nDate: ${e.date}\nSubject: ${e.subject}\n${e.bodyPreview}`,
    )
    .join("\n---\n");

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a professional sales email writer. Draft a follow-up email for a stale deal.
Return a JSON object with "subject" and "body" fields.

Guidelines:
- Be warm, professional, and concise (under 150 words for body)
- Reference the deal context naturally without being pushy
- For critical/high urgency: more direct, reference timeline or next steps
- For medium/low urgency: softer check-in, offer value or ask open question
- If there's email history, reference previous conversation naturally
- Address the contact by first name
- Sign off with just the rep's name (will be filled in by the rep)
- Do NOT include placeholder brackets like [Your Name] — end with a simple sign-off`,
      },
      {
        role: "user",
        content: JSON.stringify({
          dealName: deal.dealName,
          stage: deal.dealStage,
          amount: deal.amount,
          closeDate: deal.closeDate,
          daysSinceLastActivity: deal.daysSinceLastActivity,
          contactName: deal.contactName,
          companyName: deal.companyName,
          urgencyScore,
          urgencyReason,
          emailHistory: emailHistory || "No previous emails found.",
        }),
      },
    ],
  });

  const content = response.choices[0].message.content ?? "{}";
  return draftResponseSchema.parse(JSON.parse(content));
}
