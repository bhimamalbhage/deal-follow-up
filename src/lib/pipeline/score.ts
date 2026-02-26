import { scoreUrgency, type UrgencyResult } from "@/lib/ai/scoring";
import type { DealContext } from "@/types/deal";

export interface ScoredDeal {
  deal: DealContext;
  urgency: UrgencyResult;
}

export async function scoreStalDeals(deals: DealContext[]): Promise<ScoredDeal[]> {
  console.log(`[Score] Starting scoring for ${deals.length} deals...`);
  const scored: ScoredDeal[] = [];

  for (const deal of deals) {
    console.log(`[Score] Scoring deal ID: ${deal.dealId} (${deal.dealName})...`);
    const urgency = await scoreUrgency(deal);
    console.log(`[Score] Deal ${deal.dealId} scored as: ${urgency.score}`);
    scored.push({ deal, urgency });
  }

  // Sort by urgency: critical first, then high, medium, low
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  scored.sort((a, b) => order[a.urgency.score] - order[b.urgency.score]);

  return scored;
}
