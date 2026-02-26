import { sendEmail } from "./src/lib/hubspot/emails";

async function main() {
    try {
        const dealId = "305955893974"; // Real deal ID from follow-ups.json
        await sendEmail("bhimamalbhage1008@gmail.com", "Test Subject", "Test Body for Note", dealId);
        console.log("Success associating note with deal", dealId);
    } catch (err: any) {
        console.error("Error creating note/association:", err?.message || err);
        if (err.body) console.error("Body:", err.body);
        if (err.response?.body) console.error("Response Body:", err.response.body);
    }
}
main();
