# Deal Follow-Up PRD

**Problem**

Sales reps lose deals because follow-ups slip through the cracks. Leads go cold, deals stall, and reps don't act fast enough — not because they don't care, but because they're juggling too many deals with no system telling them *what to do next and when*.

HubSpot tracks activity. Slack is where reps live. But nothing connects the two with intelligence in between.

---

## Solution

An autonomous follow-up agent that monitors HubSpot deal activity, detects stale leads, drafts context-aware follow-up emails using AI, and delivers them to reps in Slack for one-click approval. Once approved, the email sends via HubSpot and the deal record updates automatically.

**Core loop:** Detect → Score → Draft → Approve → Execute

---

## Key Features

### P0 — Must Have

**1. Stale Deal Detection**

- Monitor HubSpot deals for email inactivity (no reply in X days)
- Configurable staleness threshold per deal stage (e.g., 3 days in Negotiation, 7 days in Discovery)

**2. Urgency Scoring**

- Agent 1 analyzes deal context: stage, deal value, days since last contact, activity trend
- Outputs urgency score (Critical / High / Medium / Low) with reasoning

**3. AI-Drafted Follow-Up**

- Agent 2 pulls full deal context from HubSpot (contact info, last 3 emails, deal notes, deal stage)
- Generates a personalized follow-up email that references prior conversations — not a generic "just checking in"

**4. Slack Notification with Approval**

- Rich Slack Block Kit message containing: urgency tag, deal summary, draft email preview
- Three action buttons: ✅ Approve & Send | ✏️ Edit | ❌ Dismiss

**5. Execution on Approval**

- Approve → sends email via HubSpot Email API
- Deal activity auto-logs the follow-up
- Deal record updates with "Last Follow-Up" timestamp-