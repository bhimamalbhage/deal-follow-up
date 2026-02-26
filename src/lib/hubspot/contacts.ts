import { hubspotClient } from "./client";

export interface HubSpotContact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string | null;
}

export async function getContactForDeal(dealId: string): Promise<HubSpotContact | null> {
  const client = hubspotClient();

  const associations = await client.crm.associations.v4.basicApi.getPage(
    "deals",
    dealId,
    "contacts",
  );

  if (!associations.results.length) return null;

  const contactId = associations.results[0].toObjectId;
  const contact = await client.crm.contacts.basicApi.getById(String(contactId), [
    "email",
    "firstname",
    "lastname",
    "company",
  ]);

  return {
    id: contact.id,
    email: contact.properties.email ?? "",
    firstName: contact.properties.firstname ?? "",
    lastName: contact.properties.lastname ?? "",
    company: contact.properties.company ?? null,
  };
}
