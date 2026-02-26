import { hubspotClient } from "./client";

export interface HubSpotDeal {
  id: string;
  properties: {
    dealname: string;
    dealstage: string;
    amount: string | null;
    closedate: string | null;
    hubspot_owner_id: string | null;
    hs_lastmodifieddate: string | null;
    notes_last_updated: string | null;
  };
}

export async function fetchOpenDeals(): Promise<HubSpotDeal[]> {
  const client = hubspotClient();
  const deals: HubSpotDeal[] = [];
  let after: string | undefined;

  do {
    const response = await client.crm.deals.basicApi.getPage(
      100,
      after,
      [
        "dealname",
        "dealstage",
        "amount",
        "closedate",
        "hubspot_owner_id",
        "hs_lastmodifieddate",
        "notes_last_updated",
      ],
      undefined,
      undefined,
      false,
    );

    for (const deal of response.results) {
      deals.push(deal as unknown as HubSpotDeal);
    }

    after = response.paging?.next?.after;
  } while (after);

  return deals;
}

export async function getOwnerEmail(ownerId: string): Promise<string> {
  const client = hubspotClient();
  const owner = await client.crm.owners.ownersApi.getById(Number(ownerId));
  return owner.email ?? "unknown@example.com";
}
