# Deal Follow-Up Agent

Autonomous sales follow-up pipeline that monitors HubSpot deals, detects stale leads, uses AI to score urgency and draft personalized emails, then delivers them to Slack for one-click approval. Approved emails log directly to HubSpot deal activity.

**Core loop:** Detect → Score → Draft → Approve → Execute

## How It Works

1. **Detect** — Fetches all open deals from HubSpot, checks last email activity against configurable staleness thresholds per deal stage
2. **Score** — Sends deal context to OpenAI, returns urgency level (critical / high / medium / low) with reasoning
3. **Draft** — Sends full context (deal info, last 3 emails, urgency) to OpenAI, generates a personalized follow-up email
4. **Notify** — Posts a rich Slack Block Kit message with urgency tag, deal summary, email preview, and Approve/Dismiss buttons
5. **Execute** — On approval, logs the email as a note on the HubSpot deal and updates the Slack message
