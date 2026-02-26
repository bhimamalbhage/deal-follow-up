import { fetchOpenDeals, getOwnerEmail, type HubSpotDeal } from "@/lib/hubspot/deals";
import { getContactForDeal } from "@/lib/hubspot/contacts";
import { getRecentEmails, getLastEmailDate } from "@/lib/hubspot/emails";
import { getThresholdForStage } from "@/types/config";
import { getByDealId } from "@/lib/store";
import type { DealContext } from "@/types/deal";

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export async function detectStalDeals(): Promise<DealContext[]> {
  console.log("[Detect] Fetching open deals from HubSpot...");
  const deals = await fetchOpenDeals();
  console.log(`[Detect] Fetched ${deals.length} open deals. Analyzing staleness...`);
  const now = new Date();
  const staleDeals: DealContext[] = [];

  for (const deal of deals) {
    // Skip if there's already a pending follow-up for this deal
    const existing = await getByDealId(deal.id);
    if (existing) continue;

    const stage = deal.properties.dealstage ?? "default";
    const threshold = getThresholdForStage(stage);

    // Determine last activity date
    const lastEmailDate = await getLastEmailDate(deal.id);
    const lastModified = deal.properties.hs_lastmodifieddate
      ? new Date(deal.properties.hs_lastmodifieddate)
      : null;

    const lastActivity = lastEmailDate ?? lastModified ?? null;

    // For testing: treat all open deals as stale (threshold is 0)
    const daysSince = lastActivity ? daysBetween(lastActivity, now) : 0;
    if (daysSince < threshold) continue;

    // Build full deal context
    const contact = await getContactForDeal(deal.id);
    if (!contact || !contact.email) continue;

    let ownerEmail = "unknown@example.com";
    if (deal.properties.hubspot_owner_id) {
      try {
        ownerEmail = await getOwnerEmail(deal.properties.hubspot_owner_id);
      } catch (err) {
        console.warn(`[Detect] Could not fetch owner for deal ${deal.id} (missing scope?), using fallback.`);
      }
    }

    const recentEmails = await getRecentEmails(deal.id, 3);

    staleDeals.push({
      dealId: deal.id,
      dealName: deal.properties.dealname ?? "Unnamed Deal",
      dealStage: stage,
      amount: deal.properties.amount ? Number(deal.properties.amount) : null,
      closeDate: deal.properties.closedate ?? null,
      ownerEmail,
      contactName: `${contact.firstName} ${contact.lastName}`.trim(),
      contactEmail: contact.email,
      companyName: contact.company,
      daysSinceLastActivity: daysSince,
      recentEmails,
      notes: [],
    });
  }

  return staleDeals;
}
