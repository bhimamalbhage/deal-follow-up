import { draftFollowUpEmail, type EmailDraft } from "@/lib/ai/drafting";
import type { ScoredDeal } from "./score";

export interface DraftedDeal {
  deal: ScoredDeal["deal"];
  urgency: ScoredDeal["urgency"];
  draft: EmailDraft;
}

export async function draftEmails(scoredDeals: ScoredDeal[]): Promise<DraftedDeal[]> {
  console.log(`[Draft] Starting email drafting for ${scoredDeals.length} deals...`);
  const drafted: DraftedDeal[] = [];

  for (const { deal, urgency } of scoredDeals) {
    console.log(`[Draft] Drafting email for deal ID: ${deal.dealId}...`);
    const draft = await draftFollowUpEmail(deal, urgency.score, urgency.reason);
    console.log(`[Draft] Draft generated for deal ID: ${deal.dealId}. Subject: "${draft.subject}"`);
    drafted.push({ deal, urgency, draft });
  }

  return drafted;
}
