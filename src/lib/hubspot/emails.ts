import { AssociationSpecAssociationCategoryEnum } from "@hubspot/api-client/lib/codegen/crm/associations/v4/models/AssociationSpec";
import { FilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/contacts/models/Filter";
import { hubspotClient } from "./client";
import type { EmailSummary } from "@/types/deal";

export async function getRecentEmails(
  dealId: string,
  limit = 3,
): Promise<EmailSummary[]> {
  const client = hubspotClient();

  const associations = await client.crm.associations.v4.basicApi.getPage(
    "deals",
    dealId,
    "emails",
  );

  if (!associations.results.length) return [];

  const emailIds = associations.results
    .slice(0, limit)
    .map((a) => String(a.toObjectId));

  const emails: EmailSummary[] = [];

  for (const emailId of emailIds) {
    try {
      const email = await client.crm.objects.emails.basicApi.getById(emailId, [
        "hs_email_subject",
        "hs_email_from",
        "hs_email_to",
        "hs_email_text",
        "hs_timestamp",
      ]);

      emails.push({
        subject: email.properties.hs_email_subject ?? "(no subject)",
        from: email.properties.hs_email_from ?? "",
        to: email.properties.hs_email_to ?? "",
        date: email.properties.hs_timestamp ?? "",
        bodyPreview: (email.properties.hs_email_text ?? "").slice(0, 500),
      });
    } catch {
      // Skip emails we can't access
    }
  }

  return emails.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export async function getLastEmailDate(dealId: string): Promise<Date | null> {
  const emails = await getRecentEmails(dealId, 1);
  if (!emails.length) return null;
  return new Date(emails[0].date);
}

export async function sendEmail(
  contactEmail: string,
  subject: string,
  body: string,
  dealId: string,
): Promise<void> {
  const client = hubspotClient();

  // Log a note on the deal's activity timeline instead of sending an actual email
  const noteBody = `[Follow-Up Draft — Approved]\nTo: ${contactEmail}\nSubject: ${subject}\n\n${body}`;

  // Create note first, then associate with deal separately
  const note = await client.crm.objects.notes.basicApi.create({
    properties: {
      hs_note_body: noteBody,
      hs_timestamp: new Date().toISOString(),
    },
    associations: [],
  });

  // Associate note -> deal using v4 associations API
  await client.crm.associations.v4.basicApi.create(
    "notes",
    note.id,
    "deals",
    dealId,
    [
      {
        associationCategory: AssociationSpecAssociationCategoryEnum.HubspotDefined,
        associationTypeId: 214,
      },
    ],
  );

  console.log(`[Email] Logged follow-up note on deal ${dealId} for ${contactEmail}`);
}
