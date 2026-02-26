import { hubspotClient } from "./src/lib/hubspot/client";

async function main() {
    const client = hubspotClient();
    const dealId = "305955893974";

    try {
        const associations = await client.crm.associations.v4.basicApi.getPage("deals", dealId, "notes");

        if (associations.results.length === 0) {
            console.log("No notes found for this deal");
            return;
        }

        for (const assoc of associations.results) {
            const noteId = String(assoc.toObjectId);
            const note = await client.crm.objects.notes.basicApi.getById(noteId, ["hs_note_body", "hs_timestamp"]);
            console.log(`Note ID: ${note.id}`);
            console.log(`Body: ${note.properties.hs_note_body}`);
            console.log(`Timestamp: ${note.properties.hs_timestamp}`);
            console.log("-------------------");
        }
    } catch (err: any) {
        console.error("Error fetching notes:", err?.message || err);
    }
}
main();
