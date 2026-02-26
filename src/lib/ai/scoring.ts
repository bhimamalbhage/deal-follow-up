import { z } from "zod";
import { openaiClient } from "./client";
import type { DealContext } from "@/types/deal";
import type { UrgencyLevel } from "@/types/follow-up";

const urgencyResponseSchema = z.object({
  score: z.enum(["critical", "high", "medium", "low"]),
  reason: z.string(),
});

export interface UrgencyResult {
  score: UrgencyLevel;
  reason: string;
}

export async function scoreUrgency(deal: DealContext): Promise<UrgencyResult> {
  const client = openaiClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a sales urgency scoring agent. Analyze the deal context and return a JSON object with:
- "score": one of "critical", "high", "medium", "low"
- "reason": a brief explanation (1-2 sentences) of why this urgency level was assigned

Scoring guidelines:
- critical: Deal amount > $50k AND stale > 5 days, OR close date is past/within 3 days
- high: Deal in negotiation/contract sent AND stale > threshold, OR amount > $20k stale > 3 days
- medium: Deal stale past threshold but earlier stage or lower amount
- low: Barely past threshold, early stage, no close date pressure`,
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
          recentEmailCount: deal.recentEmails.length,
        }),
      },
    ],
  });

  const content = response.choices[0].message.content ?? "{}";
  const parsed = urgencyResponseSchema.parse(JSON.parse(content));

  return { score: parsed.score, reason: parsed.reason };
}
